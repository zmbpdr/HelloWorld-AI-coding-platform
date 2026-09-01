"""诊断题从硬编码迁移到数据库后的回归测试。"""

from types import SimpleNamespace

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models  # noqa: F401 - 注册 Base.metadata 中的全部 ORM 模型
from app.database import Base
from app.models.diagnostic_question import DiagnosticQuestion
from app.routers.diagnostic import get_questions
from app.services import diagnostic_service, seed_service


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def seeded_session_factory(tmp_path, monkeypatch):
    """使用临时 SQLite 库运行真实种子逻辑，避免触碰开发数据库。"""
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'diagnostic-test.db'}")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    monkeypatch.setattr(seed_service, "async_session", session_factory)
    # 管理员密码哈希不属于诊断种子行为；隔离 bcrypt 版本差异，专注验证数据迁移。
    monkeypatch.setattr(seed_service, "get_password_hash", lambda _password: "test-hash")
    await seed_service.seed_database()
    yield session_factory
    await engine.dispose()


@pytest.mark.anyio
async def test_seeded_diagnostic_questions_are_visible_but_never_leak_answers(seeded_session_factory):
    """学生端只收到启用题目，且响应中绝不能包含正确答案。"""
    async with seeded_session_factory() as session:
        response = await get_questions(current_user=SimpleNamespace(id=1), db=session)

    assert len(response["questions"]) == 10
    assert all("answer" not in question for question in response["questions"])
    assert [question["order"] for question in response["questions"]] == list(range(1, 11))


@pytest.mark.anyio
async def test_second_seed_keeps_teacher_edited_question_and_inactive_questions_are_excluded(seeded_session_factory):
    """二次启动不可覆盖教师修改，停用题目也不能进入学生诊断。"""
    async with seeded_session_factory() as session:
        first_question = (
            await session.execute(
                select(DiagnosticQuestion).order_by(DiagnosticQuestion.order).limit(1)
            )
        ).scalars().one()
        first_question.question = "教师已修改的诊断题"
        first_question.answer = "D"
        first_question.is_active = False
        await session.commit()

    await seed_service.seed_database()

    async with seeded_session_factory() as session:
        questions = (
            await session.execute(select(DiagnosticQuestion).order_by(DiagnosticQuestion.order))
        ).scalars().all()
        active_questions = await diagnostic_service.get_diagnostic_questions(session)

    assert len(questions) == 10
    assert questions[0].question == "教师已修改的诊断题"
    assert questions[0].answer == "D"
    assert questions[0].is_active is False
    assert len(active_questions) == 9
    assert all(question["id"] != questions[0].id for question in active_questions)


@pytest.mark.anyio
async def test_scoring_reads_the_teacher_updated_answer(seeded_session_factory):
    """评分必须从数据库读取最新答案，而不是回退到旧硬编码题库。"""
    async with seeded_session_factory() as session:
        first_question = (
            await session.execute(
                select(DiagnosticQuestion).order_by(DiagnosticQuestion.order).limit(1)
            )
        ).scalars().one()
        first_question.answer = "D"
        await session.commit()

        active_questions = await diagnostic_service.get_diagnostic_questions(session)
        answers = [
            {"question_id": question["id"], "answer": question["answer"]}
            for question in active_questions
        ]
        result = await diagnostic_service.calculate_diagnostic_result(answers, session)

    assert result["score"] == 100
    assert result["skill_level"] == "advanced"
