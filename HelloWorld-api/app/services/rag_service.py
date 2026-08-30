"""RAG 检索增强生成服务

提供两条检索路径：
1. 语义检索：ChromaDB 向量存储 + SentenceTransformer Embedding，供管理端 RAG API 使用
2. 轻量关键词检索：直接查数据库 lesson.content，供学生端 AI 对话上下文注入使用，无需向量索引

语义检索核心流程：
1. 内容分块：按 ## 标题分割，每块 ≤ 2000 字符
2. Embedding：SentenceTransformer（all-MiniLM-L6-v2）
3. 存储：ChromaDB 持久化存储向量 + 元数据
4. 检索：余弦相似度检索 top_k 结果，知识点标签加权
"""

import logging
import re
from typing import Any, Optional

import chromadb
from chromadb.utils import embedding_functions
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models.lesson import Lesson
from app.models.course import Language

logger = logging.getLogger(__name__)

# ChromaDB 持久化存储路径
CHROMA_PERSIST_DIR = "./chroma_data"
COLLECTION_NAME = "lessons"

# 分块参数
MAX_CHUNK_SIZE = 2000
CHUNK_OVERLAP = 100

# 检索参数
DEFAULT_TOP_K = 5
TAG_WEIGHT_BOOST = 0.15


# ---- ChromaDB 客户端 ----
_client: Optional[chromadb.PersistentClient] = None
_embedding_fn: Optional[embedding_functions.SentenceTransformerEmbeddingFunction] = None


def _get_chroma_client() -> chromadb.PersistentClient:
    """获取 ChromaDB 持久化客户端（单例）"""
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
        logger.info("ChromaDB 客户端初始化完成: %s", CHROMA_PERSIST_DIR)
    return _client


def _get_embedding_fn():
    """获取 SentenceTransformer embedding 函数"""
    global _embedding_fn
    if _embedding_fn is None:
        _embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        logger.info("Embedding 函数初始化完成: SentenceTransformer (all-MiniLM-L6-v2)")
    return _embedding_fn


def _get_collection():
    """获取或创建 lessons collection"""
    client = _get_chroma_client()
    ef = _get_embedding_fn()
    try:
        return client.get_collection(
            name=COLLECTION_NAME,
            embedding_function=ef,
        )
    except Exception:
        logger.info("创建新 collection: %s", COLLECTION_NAME)
        return client.create_collection(
            name=COLLECTION_NAME,
            embedding_function=ef,
            metadata={"description": "课程内容向量索引"},
        )


# ---- 内容分块 ----
def chunk_content(content: str, lesson_title: str = "") -> list[dict]:
    """将课程内容按 ## 标题分块

    Args:
        content: 课程 Markdown 内容
        lesson_title: 课程标题（用于构建块标题）

    Returns:
        分块列表，每项 {"title": str, "content": str, "char_count": int}
    """
    if not content:
        return []

    chunks: list[dict] = []
    sections = content.split("\n## ")

    for i, section in enumerate(sections):
        section = section.strip()
        if not section:
            continue

        if "\n" in section:
            first_line, rest = section.split("\n", 1)
        else:
            first_line, rest = section, ""

        heading = first_line.lstrip("#").strip()

        if i == 0 and not heading:
            chunk_title = lesson_title
        else:
            chunk_title = f"{lesson_title} > {heading}" if lesson_title else heading

        chunk_text = f"{chunk_title}\n{rest}".strip()

        if len(chunk_text) > MAX_CHUNK_SIZE:
            sub_chunks = _split_long_chunk(chunk_text, chunk_title)
            chunks.extend(sub_chunks)
        else:
            chunks.append({
                "title": chunk_title,
                "content": chunk_text,
                "char_count": len(chunk_text),
            })

    return chunks


def _split_long_chunk(text: str, title: str) -> list[dict]:
    """将超长块按段落边界进一步拆分"""
    chunks: list[dict] = []
    paragraphs = text.split("\n\n")
    current = ""
    part = 1

    for para in paragraphs:
        if len(current) + len(para) + 2 > MAX_CHUNK_SIZE and current:
            chunks.append({
                "title": f"{title} (第{part}部分)",
                "content": current.strip(),
                "char_count": len(current.strip()),
            })
            current = para
            part += 1
        else:
            current = f"{current}\n\n{para}" if current else para

    if current.strip():
        chunks.append({
            "title": f"{title} (第{part}部分)" if part > 1 else title,
            "content": current.strip(),
            "char_count": len(current.strip()),
        })

    return chunks


# ---- 索引操作 ----
async def index_lesson(lesson_id: int, db: Optional[AsyncSession] = None) -> int:
    """索引单篇课程内容

    Args:
        lesson_id: 课程 ID
        db: 数据库会话（可选，不传则自动创建）

    Returns:
        索引的块数量
    """
    close_db = False
    if db is None:
        db = async_session()
        close_db = True

    try:
        result = await db.execute(
            select(Lesson).where(Lesson.id == lesson_id)
        )
        lesson = result.scalars().first()
        if not lesson:
            logger.warning("课程不存在: lesson_id=%d", lesson_id)
            return 0

        lang_result = await db.execute(
            select(Language.name).where(Language.id == lesson.language_id)
        )
        lang_name = lang_result.scalars().first() or "未知"

        # 构建索引文本
        index_text = f"# {lesson.title}\n"
        if lesson.description:
            index_text += f"{lesson.description}\n\n"
        if lesson.content:
            index_text += lesson.content

        # 分块
        chunks = chunk_content(index_text, lesson.title)
        if not chunks:
            return 0

        # 写入 ChromaDB（embedding 由 collection 的 embedding_function 自动处理）
        collection = _get_collection()
        ids = [f"lesson_{lesson_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "lesson_id": lesson_id,
                "lesson_title": lesson.title,
                "lesson_slug": lesson.slug,
                "language": lang_name,
                "knowledge_tags": ",".join(lesson.knowledge_tags) if lesson.knowledge_tags else "",
                "chunk_title": c["title"],
                "char_count": c["char_count"],
            }
            for c in chunks
        ]
        documents = [c["content"] for c in chunks]

        collection.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas,
        )

        logger.info("索引完成: lesson_id=%d (%s), 共 %d 块", lesson_id, lesson.title, len(chunks))
        return len(chunks)

    finally:
        if close_db:
            await db.close()


async def index_all_lessons(db: Optional[AsyncSession] = None) -> dict:
    """全量索引所有课程内容

    Args:
        db: 数据库会话（可选）

    Returns:
        {"total": int, "indexed": int, "errors": int}
    """
    close_db = False
    if db is None:
        db = async_session()
        close_db = True

    try:
        result = await db.execute(
            select(Lesson).where(Lesson.is_active == True)
        )
        lessons = result.scalars().all()

        total = len(lessons)
        indexed = 0
        errors = 0

        for lesson in lessons:
            try:
                chunks = await index_lesson(lesson.id, db)
                indexed += chunks
            except Exception as e:
                logger.error("索引失败: lesson_id=%d (%s): %s", lesson.id, lesson.title, e)
                errors += 1

        logger.info("全量索引完成: %d 篇课程, %d 块, %d 错误", total, indexed, errors)
        return {"total": total, "indexed": indexed, "errors": errors}

    finally:
        if close_db:
            await db.close()


async def delete_lesson_index(lesson_id: int) -> bool:
    """删除指定课程的索引"""
    try:
        collection = _get_collection()
        result = collection.get(
            where={"lesson_id": lesson_id},
        )
        if result and result["ids"]:
            collection.delete(ids=result["ids"])
            logger.info("索引已删除: lesson_id=%d, 共 %d 块", lesson_id, len(result["ids"]))
            return True
        return False
    except Exception as e:
        logger.error("删除索引失败: lesson_id=%d: %s", lesson_id, e)
        return False


# ---- 检索 ----
async def search(
    query: str,
    top_k: int = DEFAULT_TOP_K,
    tag_filter: Optional[str] = None,
) -> list[dict]:
    """语义检索课程内容

    Args:
        query: 查询文本
        top_k: 返回结果数量（默认 5）
        tag_filter: 知识点标签过滤（可选）

    Returns:
        检索结果列表，每项 {"content": str, "lesson_title": str, "lesson_id": int,
                        "language": str, "knowledge_tags": list, "score": float}
    """
    if not query.strip():
        return []

    try:
        collection = _get_collection()

        where_filter = None
        if tag_filter:
            where_filter = {"knowledge_tags": {"$contains": tag_filter}}

        results = collection.query(
            query_texts=[query],
            n_results=top_k * 2,
            where=where_filter,
        )

        if not results or not results["ids"] or not results["ids"][0]:
            return []

        items: list[dict] = []
        for i in range(len(results["ids"][0])):
            metadata = results["metadatas"][0][i] if results["metadatas"] else {}
            distance = results["distances"][0][i] if results["distances"] else 0

            base_score = 1.0 - distance

            tags = metadata.get("knowledge_tags", "").split(",") if metadata.get("knowledge_tags") else []
            tag_score = _compute_tag_score(query, tags)
            final_score = base_score * (1.0 + tag_score * TAG_WEIGHT_BOOST)

            items.append({
                "content": results["documents"][0][i] if results["documents"] else "",
                "lesson_title": metadata.get("lesson_title", ""),
                "lesson_id": metadata.get("lesson_id", 0),
                "lesson_slug": metadata.get("lesson_slug", ""),
                "language": metadata.get("language", ""),
                "knowledge_tags": tags,
                "score": round(final_score, 4),
            })

        items.sort(key=lambda x: x["score"], reverse=True)
        return items[:top_k]

    except Exception as e:
        logger.error("检索失败: %s", e)
        return []


def _compute_tag_score(query: str, tags: list[str]) -> float:
    """计算查询与知识点标签的匹配度"""
    if not tags:
        return 0.0

    query_lower = query.lower()
    matched = sum(1 for tag in tags if tag.lower() in query_lower)
    return min(matched / len(tags), 1.0)


# ---- 索引状态 ----
async def get_index_status() -> dict:
    """获取索引状态信息"""
    try:
        collection = _get_collection()
        count = collection.count()
        return {
            "total_indexed": count,
            "collection_name": COLLECTION_NAME,
            "embedding_model": "all-MiniLM-L6-v2 (SentenceTransformer)",
            "storage_path": CHROMA_PERSIST_DIR,
        }
    except Exception as e:
        logger.error("获取索引状态失败: %s", e)
        return {
            "total_indexed": 0,
            "collection_name": COLLECTION_NAME,
            "embedding_model": "all-MiniLM-L6-v2 (SentenceTransformer)",
            "storage_path": CHROMA_PERSIST_DIR,
            "error": str(e),
        }


# ---- 轻量关键词检索（AI 对话上下文注入用，无需向量索引） ----
def _tokenize(text: str) -> set[str]:
    return set(re.findall(r"[A-Za-z0-9\u4e00-\u9fa5]+", (text or "").lower()))


def _split_content_to_chunks(title: str, content: str) -> list[str]:
    if not content:
        return []
    sections = re.split(r"\n(?=\s*#{1,4}\s)", content)
    chunks: list[str] = []
    for section in sections:
        cleaned = " ".join(section.strip().split())
        if cleaned:
            chunks.append(cleaned)
    if not chunks:
        chunks.append(" ".join(content.split()))
    return chunks[:10]


def _score_chunk(query: str, title: str, chunk: str) -> float:
    query_tokens = _tokenize(query)
    if not query_tokens:
        return 0.0
    title_tokens = _tokenize(title)
    text_tokens = _tokenize(chunk)
    overlap = query_tokens & text_tokens
    title_overlap = query_tokens & title_tokens
    score = len(overlap) * 2 + len(title_overlap) * 3
    if title and title.lower() in (chunk or "").lower():
        score += 5
    return float(score)


async def search_lesson_context(
    db: AsyncSession,
    lesson_id: int | None,
    query: str,
    limit: int = 3,
) -> list[dict[str, Any]]:
    """根据课时 ID 和用户问题，召回最相关教学内容片段。"""
    if lesson_id is None:
        return []

    lesson_result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = lesson_result.scalars().first()
    if not lesson or not (lesson.content or lesson.title):
        return []

    chunks = _split_content_to_chunks(lesson.title, lesson.content or "")
    if not chunks:
        return []

    scored: list[tuple[float, str]] = []
    for chunk in chunks:
        score = _score_chunk(query, lesson.title, chunk)
        if score > 0:
            scored.append((score, chunk))

    if not scored:
        return []

    ranked = sorted(scored, key=lambda item: item[0], reverse=True)[:limit]
    results: list[dict[str, Any]] = []
    for score, chunk in ranked:
        snippet = " ".join(chunk.split())
        if len(snippet) > 600:
            snippet = snippet[:600].rstrip() + "..."
        results.append({
            "title": lesson.title,
            "content": snippet,
            "score": round(score, 2),
        })
    return results
