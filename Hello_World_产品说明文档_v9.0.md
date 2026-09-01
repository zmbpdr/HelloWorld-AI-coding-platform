## 一、产品愿景与定位

Hello World 是一个面向编程初学者的**闯关式 AI 编程学习平台**，目标用户为初高中生及机房教学场景。平台通过"闯关 + AI 辅助"的方式，让学生打开浏览器即可零配置开始编程学习。

产品的完整形态包含两大核心板块：

| 板块 | 目标用户 | 核心能力 |
|------|---------|---------|
| **学生学习端** | 初高中生 | 172 关闯关学习、AI 智能体辅导、代码评测、能力诊断、错题本、智能体工坊 |
| **教师创作工具** | 教师/管理员 | Markdown 教程编辑器、题库管理系统、文件导入解析、教程-题目关联、诊断题管理、RAG 检索基础设施 |

**产品定位：** 从"只面向学生"升级为"学生 + 教师双端协同"，教师可自主编写图文并茂的教程、管理题库与诊断题，形成完整的教学闭环。面向机房教学场景，学生端零配置，服务端统一维护运行时环境，实现"50 台机器的环境配置 → 1 台服务器的部署"的效率提升。

### 平台核心指标

| 指标 | 数值 |
|------|------|
| 闯关关卡 | 172 道 |
| 编程语言 | 6 种（Python / JavaScript / Java / C / C++ / TypeScript） |
| AI 智能体模式 | 4 种（诊断 / 导师 / 审查 / 规划） |
| 智能体工坊主线 | 8 条，92 个节点 |
| 数据库表 | 21 张（v9.0 新增 diagnostic_questions） |
| API 端点 | 50+ 个（v9.0 新增 13 个） |
| 教师创作工具 | 6 项已交付 + 3 项 v9.0 新增（后端层） |

---

## 二、学生学习端（已实现）

### 2.1 闯关学习

平台为 6 种编程语言设计了总计 172 道闯关关卡。每道关卡包含：内容标题、题目描述、难度等级、XP 奖励、起始代码、测试用例、提示信息和知识点标签。关卡采用**顺序解锁机制**：第 1 关始终可用，后续关卡必须前置通关后自动解锁。用户完成关卡后，系统自动结算得分、评定星级（0-5 星）并增加 XP，每 100 XP 升一级。

| 语言 | 关卡数 |
|------|-------|
| Python | 34 |
| JavaScript | 30 |
| Java | 30 |
| C | 20 |
| C++ | 28 |
| TypeScript | 30 |
| **合计** | **172** |

### 2.2 能力诊断

注册用户可在课程大厅入口进行能力诊断。系统提供 10 道选择题，覆盖 Python 核心知识点（变量、循环、函数、数据结构等）。提交答案后后端纯代码评分，根据得分判定能力等级（入门级/进阶级/高级）并推荐学习起点。诊断结果存入数据库并在前端展示。

**v9.0 升级：** 诊断题已从源码硬编码迁移至数据库 `diagnostic_questions` 表存储，配套教师端管理 API（新增/编辑/删除/启停/排序）完整交付，管理后台界面建设中。题库可运营是产品商业化的前提——买家改题不再需要接触源码。

**评分规则：** 0-30 分入门级（从第一关开始），31-60 分入门级（可跳过基础关），61-80 分进阶级（从循环/函数开始），81-100 分高级（挑战高级内容）。

### 2.3 AI 智能体"小智"

AI 助手支持 4 种角色模式：

- **诊断模式**：分析代码错误，逐条列出问题并给出修复建议
- **导师模式**：用启发式方式引导学习者自己发现问题，不直接给答案
- **审查模式**：从正确性、可读性、性能、健壮性四个维度评分并展示雷达图
- **规划模式**：根据知识掌握情况推荐学习方向

系统采用抽象工厂模式设计 AI 提供者（DeepSeek API 主调用 + Mock 降级方案），实现了 WebSocket 流式对话和对话历史数据库持久化。

### 2.4 代码评测引擎

平台自主研发了一套代码评测引擎（`judge_service.py`），支持 6 种编程语言的代码编译和执行。用户提交代码后，后端查出测试用例，将代码与用例拼接后通过 subprocess 模块启动子进程执行。执行完成后通过智能比对方法（精确匹配、数值近似 <0.0001、子串匹配、空白归一化、numpy 前缀清洗）判断结果。评测**完全不依赖 AI**，AI 仅在代码出错后做错误分类时介入。

### 2.5 知识掌握度与推荐

系统基于加权平均算法（新掌握度 = 当前得分 × 0.6 + 历史掌握度 × 0.4）自动更新用户的知识点掌握度。推荐算法为规则驱动方式：找出用户掌握度最低的知识标签→筛选覆盖该标签的未完成关卡→按掌握度升序推荐最多 3 条。新用户无匹配时返回下一节顺序学习关卡作为兜底。课程地图中推荐关卡显示"推荐"标签。

### 2.6 错题本与双轨降级

每次提交未拿满分时，系统自动记录代码和错误信息，并调用 AI 进行错误分类（syntax / logic / boundary / performance）。如果 AI 调用因网络原因失败，自动降级到规则关键词匹配分类。错题本支持按类型筛选、AI 分析展开查看、标记已解决和重新挑战。

### 2.7 会员系统

平台实现了 Mock 会员系统，设计 Free 和 Pro 双方案：免费用户每天可使用 AI 智能体 5 次，Pro 用户不限次数。该系统为演示功能，未接真实支付。

### 2.8 智能体工坊

平台额外提供了 8 条 AI 学习主线，以神经元地图形式展示共计 92 个学习节点：

| 主线 | 节点数 |
|------|-------|
| 机器学习 | 8 |
| Agent 开发 | 28 |
| 大模型应用 | 8 |
| 综合项目 | 8 |
| 深度学习 | 12 |
| 自然语言处理 | 10 |
| 计算机视觉 | 10 |
| 强化学习 | 8 |

节点之间通过连线连接形成可视化路径，每个节点设置五级能量评分系统（理解度、实现度、优化度、创新度四个维度）。

---

## 三、教师创作工具（已实现）

教师创作工具是产品从"纯学生端"升级为"教学闭环"的关键模块。教师可通过管理后台自主编写图文并茂的教程、管理题库，实现教学内容的持续迭代。

### 3.1 Markdown 教程编辑器

教师在管理后台使用 Markdown 编辑器编写教程，左侧编辑区 + 右侧实时预览，支持图片的多种输入方式。

- **工具栏**：标题（H1-H3）、加粗、斜体、删除线、引用、行内代码、代码块、有序/无序列表、任务列表、链接、图片、表格、分屏预览、全屏
- **图片上传**：工具栏按钮选择文件、拖拽到编辑区、Ctrl+V 粘贴剪贴板图片三种方式
- **实时预览**：`preview="live"` 分屏渲染，支持拖拽调整比例

### 3.2 图片上传安全机制

- 校验管理员权限（`require_role("editor")` 依赖注入）
- 限制文件大小 ≤ 5MB
- 服务端通过 magic bytes 校验真实文件类型（jpg/png/gif/webp），不信任浏览器 MIME 类型
- 禁止 SVG（可携带脚本）
- 服务端生成 UUID 文件名，按日期分目录存储：`static/uploads/{YYYYMMDD}/{uuid}.{ext}`

### 3.3 题库管理系统

题库存储于数据库 `questions` 表（6 种题型：单选/多选/判断/填空/编程/简答），教师通过管理后台独立管理：

- 题目列表（分页、按语言/知识点/难度筛选、关键词搜索）
- 新增/编辑/删除题目（含测试用例 JSON 编辑器、知识点标签管理）
- Excel/CSV 批量导入（含模板下载）
- 批量导出（按语言/知识点/难度筛选）

### 3.4 教程-题目关联

编辑关卡时可多选关联已有题库题目，一道题可关联到多个教程关卡，实现"学-练结合"的教学闭环。

### 3.5 批量导入预检查机制

上传 Excel/CSV 后不直接入库，先返回预检查报告（错误行号、字段名、原因：必填字段缺失、slug 重复、无效测试用例格式、知识点标签越界、难度值越界），全部无错误后才允许确认入库。导入过程使用数据库事务，失败时整体回滚。

### 3.6 数据源策略（v9.0 全面落地）

明确每类数据的唯一事实来源，防止系统重启覆盖教师修改：

| 数据 | 策略 |
|------|------|
| 课程内容（lessons） | JSON 文件仅首次部署导入，之后数据库为唯一来源，重启不覆盖（**v9.0 完成**） |
| 题库（questions） | 数据库为唯一来源，历史 JSON 仅作初始化/备份 |
| 诊断题（diagnostic_questions） | 首次部署写入 10 道预设题，之后教师自由修改（**v9.0 新增**） |
| 成就、管理员、智能体节点 | 系统预设数据，代码常量控制，只增不覆盖 |
| 语言元数据（languages） | 每次启动按系统配置更新（系统配置项，非教师内容） |

---

## 四、v9.0 新增能力

### 4.1 诊断题入库与教师自主管理

**是什么：** 将入门诊断的 10 道题从 Python 源码硬编码迁移到数据库存储，并提供完整的管理端 API。

**怎么用（API 层面）：** 教师通过管理端 API 增删改诊断题；学生端诊断流程完全不变——系统自动从数据库读取当前启用的题目（按 order 排序），返回时剥离正确答案防止泄露。停用的题目学生端不显示。

| 端点 | 方法 | 说明 |
|------|:----:|------|
| `/api/v1/admin/diagnostic-questions` | GET | 列表（分页 + 标签筛选） |
| `/api/v1/admin/diagnostic-questions/{id}` | GET | 详情 |
| `/api/v1/admin/diagnostic-questions` | POST | 新增（editor 权限） |
| `/api/v1/admin/diagnostic-questions/{id}` | PUT | 编辑 |
| `/api/v1/admin/diagnostic-questions/{id}` | DELETE | 删除（软删除） |
| `/api/v1/admin/diagnostic-questions/{id}/toggle` | POST | 启用/停用 |

**当前边界：** 管理后台的"诊断题管理"页面（DiagnosticManager）建设中，界面接入前教师通过 API 维护。

**意义：** 这是产品商业化的前提条件。硬编码意味着买家要改题必须改源码；迁移到数据库后，买家通过管理界面就能改题，产品具备持续销售条件。

### 4.2 文件导入解析（Word/PDF → Markdown）

**是什么：** 教师上传 Word 或 PDF 文件，系统自动解析为 Markdown 教程内容，内嵌图片提取落盘并替换为可访问 URL。

**怎么用（API 层面）：**

| 端点 | 说明 |
|------|------|
| `POST /api/v1/admin/lessons/parse-word` | 上传 .docx，返回 `{"markdown", "images"}` |
| `POST /api/v1/admin/lessons/parse-pdf` | 上传 .pdf，返回 `{"markdown", "images", "pages"}` |

两个端点均要求 editor 权限，限制文件 ≤ 20MB。

**解析能力：**

| 文件类型 | 解析方案 | 效果 |
|---------|---------|------|
| Word (.docx) | python-docx | 段落、标题（H1-H4）、列表、加粗/斜体、表格、内嵌图片均可较好还原 |
| PDF | PyMuPDF | 按页提取文本和图片，效果有限 |

**当前边界：** 管理后台 Markdown 编辑器的"导入文件"按钮建设中；PDF 解析不承诺 100% 还原（行业性难题），解析结果提示教师可能需要手动调整。

**意义：** 许多教师已有现成 Word 教案，文件导入显著降低内容迁移成本，是从"教师手写"到"存量内容快速接入"的通道。

### 4.3 RAG 检索基础设施

**是什么：** 基于教师编写的教程内容构建本地向量知识库，提供语义检索能力，为 AI 辅导引用教师自己的教学内容奠定基础设施。

**技术链路（已交付部分）：**

```
教程内容 → 按 ## 标题分块（≤2000字符，重叠100） → SentenceTransformer 本地 Embedding
        → ChromaDB 持久化存储（./chroma_data） → 语义检索 top_k + 知识点标签加权（+15%）
```

| 端点 | 方法 | 说明 |
|------|:----:|------|
| `/api/v1/admin/rag/status` | GET | 索引状态（块数、模型、存储路径） |
| `/api/v1/admin/rag/index-all` | POST | 全量索引（后台任务） |
| `/api/v1/admin/rag/index-lesson/{id}` | POST | 单篇索引 |
| `/api/v1/admin/rag/index-lesson/{id}` | DELETE | 删除单篇索引 |
| `/api/v1/admin/rag/search` | GET | 检索测试（q/top_k/tag） |

**关键设计决策——Embedding 本地化：** 经验证外部 Embedding API 不可用后，采用 sentence-transformers（all-MiniLM-L6-v2）本地模型。零外部 API 依赖、零调用成本、**数据不出校**——这对教育客户的数据安全诉求是重要卖点。

**当前边界（下一期规划）：** ① AI 对话前检索并注入 `_build_messages` 上下文；② 按教师/学校的内容隔离（仅检索本教师或已授权内容）；③ 管理端 RAG 状态页与学生端引用展示。

**意义：** 与竞赛题库 RAG 不同，教师内容 RAG 的内容天然匹配教学场景，零版权风险，随教师使用逐步积累。AI 回答将基于教师自己的教学内容而非通用知识库。

### 4.4 Seed 数据源策略收口

lessons 的"每次启动覆盖导入"改为"仅首次初始化"（v9.0 完成），配合既有的题库/成就/管理员/智能体节点首次检测，**五类数据全部实现"教师修改优先、重启不覆盖"**。教师可以完全信赖平台维护内容，无需担心数据丢失。

---

## 五、关于 RAG 的决策

### 5.1 竞赛题库 RAG：不做

经技术可行性分析，**竞赛题库 RAG 暂不做**。核心理由：

1. **内容不匹配**：竞赛题（LeetCode Medium/Hard、洛谷普及/提高）难度远超初高中生入门水平，RAG 检索结果学生用不上
2. **版权风险**：爬取商业题库平台存在法律风险，商业产品尤其需要谨慎
3. **维护成本高**：反爬机制需要持续对抗，4 人团队投入产出比极低

### 5.2 教师内容 RAG：基础设施已就绪

正确方向是用教师上传的教程内容做知识库。v9.0 已完成索引与检索基础设施（ChromaDB + 本地 Embedding + 管理 API），下一期完成 AI 对话注入、内容隔离与前端展示后，即可形成"教师写教程 → 系统自动索引 → 学生提问 AI 引用教师内容"的完整闭环。

---

## 六、技术架构

### 6.1 系统架构全景

```
┌─────────────────────────────────────────────────┐
│  用户接入层                                      │
│  学生浏览器 · 教师/管理员浏览器                    │
├─────────────────────────────────────────────────┤
│  前端层                                          │
│  React 学生端 (Port 5173)                        │
│  React 管理后台 (Port 5174)                      │
│  TypeScript · Vite · TailwindCSS                 │
│  Zustand · Axios · Monaco Editor · markdown-it   │
├────────── API 请求 (/api/v1/*) ─────────────────┤
│  后端网关层                                      │
│  FastAPI · Uvicorn (ASGI) · Port 8006            │
│  JWT 认证 · SQLAlchemy · Pydantic · CORS         │
├─────────────────────────────────────────────────┤
│  业务服务层                                      │
│  AI 智能体 · 代码评测 · 认证与用户               │
│  图片上传 · 题库管理 · 文件解析 · RAG 检索        │
│  DeepSeek/Mock · Subprocess · ChromaDB          │
├─────────────────────────────────────────────────┤
│  数据与外部资源层                                │
│  SQLite · ChromaDB (向量) · DeepSeek API         │
│  SentenceTransformer (本地Embedding) · 文件系统  │
└─────────────────────────────────────────────────┘
```

### 6.2 v9.0 新增后端依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| python-docx | 1.1.2 | Word 文档解析 |
| PyMuPDF | 1.24.11 | PDF 文档解析 |
| chromadb | 1.5.9 | 向量数据库（本地持久化） |
| sentence-transformers | ≥3.0.0 | 本地 Embedding 模型 |

### 6.3 前端技术栈

| 技术 | 选择 | 设计意图 |
|------|------|---------|
| 框架 | React 19 + TypeScript | 现代化开发体验，类型安全 |
| 构建工具 | Vite | 极速 HMR，开发效率优先 |
| 样式方案 | TailwindCSS（学生端）/ Ant Design（管理后台） | 原子化 CSS / 企业级组件 |
| 状态管理 | Zustand 5 | 轻量、无模板代码 |
| 代码编辑器 | Monaco Editor | VS Code 同款内核 |
| 图表库 | Chart.js | 雷达图展示 AI 四维评分 |
| Markdown 渲染 | markdown-it | 关卡内容渲染 |

### 6.4 AI 架构设计

AI 智能体采用**抽象工厂模式**：`AIProvider` 抽象基类定义 `chat` 和 `stream` 两个核心方法，`DeepSeekProvider`（主，支持 429/503 自动重试 3 次，120s 超时）和 `MockProvider`（降级）为具体实现。

**双层 Prompt 组合：** 模式级 Prompt（4 种模式各有专用 System Prompt）× 语言级 Prompt（6 种语言各配导师和审查官两套提示词），调用时自动拼接。

---

## 七、数据模型

数据库共 **21 张表**，以 SQLite 为存储引擎，通过 SQLAlchemy ORM 进行异步操作（aiosqlite）。

### 核心表说明

| 表名 | 核心字段 | 功能说明 |
|------|---------|---------|
| `users` | username, hashed_password, level, xp, membership, ai_usage_today, streak_days | 用户账号、等级经验值、会员身份 |
| `languages` | name, slug, description, color, is_active | 6 种编程语言元数据 |
| `lessons` | title, slug, language_id, order, difficulty, test_cases, knowledge_tags, prerequisites, estimated_minutes | 172 道闯关关卡 |
| `questions` | language_id, title, slug, description, difficulty, question_type, test_cases, knowledge_tags, source | 独立题库（6 种题型） |
| `lesson_questions` | lesson_id, question_id, order | 教程与题目多对多关联 |
| **`diagnostic_questions`**（v9.0 新增） | question, options(JSON), answer, tag, order, is_active | 诊断题库，教师可运营 |
| `progress` | user_id, lesson_id, status, best_score, attempts | 学习进度 |
| `submissions` | user_id, lesson_id, code, language, status, score, stderr, ai_feedback | 代码提交记录 |
| `user_diagnostics` | user_id, score, skill_level, correct_tags, weak_tags | 能力诊断结果 |
| `user_knowledge` | user_id+knowledge_tag, mastery | 知识点掌握度 |
| `user_errors` | user_id, lesson_id, error_code, error_type, ai_analysis | 错题记录 |
| `chat_histories` | user_id, lesson_id, messages (JSON) | AI 对话历史 |
| `neuron_nodes` | title, slug, track, test_cases, energy_levels | 智能体工坊节点 |
| `agent_progress` | user_id, node_id, status, energy_score, energy_detail | 智能体节点进度 |
| `admin_users` | username, role (admin/editor/viewer) | 管理后台账号 |

**v9.0 新增 `diagnostic_questions` 表结构：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Integer PK | 自增主键 |
| question | Text | 题目文本 |
| options | JSON | 选项列表，如 `["A. ...", "B. ..."]` |
| answer | String(10) | 正确答案（A/B/C/D） |
| tag | String(50) | 知识点标签 |
| order | Integer | 排序序号 |
| is_active | Boolean | 是否启用（停用后学生端不显示） |

---

## 八、API 概览

> 完整契约见 [API接口契约.md](API接口契约.md)

### 学生端 API

| 类别 | 端点 | HTTP 方法 |
|------|------|:----------:|
| 认证 | `/api/v1/auth/register`, `/login`, `/refresh` | POST |
| 课程 | `/api/v1/languages`, `/languages/{slug}/map` | GET |
| 课时 | `/api/v1/lessons/{id}`, `/lessons/{id}/submit`, `/lessons/recommend` | GET/POST |
| AI | `/api/v1/ai/chat`, `/ai/tutor`, `/ai/review`, `/ai/plan`, `/ai/classify-error` | POST |
| AI 流式 | `/api/v1/ai/chat/ws?token={jwt}` | WebSocket |
| 诊断 | `/api/v1/diagnostic/questions`, `/submit`, `/result` | GET/POST |
| 错题 | `/api/v1/errors`, `/errors/{id}/resolve` | GET/PATCH |
| 知识 | `/api/v1/progress/knowledge`, `/users/me/activity` | GET |
| 智能体 | `/api/v1/agent/map`, `/nodes/{id}`, `/nodes/{id}/submit`, `/tracks` | GET/POST |
| 会员 | `/api/v1/users/me/membership`, `/users/me/upgrade` | GET/POST |

### 教师端 API

| 类别 | 端点 | HTTP 方法 | 说明 |
|------|------|:----------:|------|
| 图片上传 | `/api/v1/admin/lessons/upload-image` | POST | 教程图片上传，含安全校验 |
| 题库管理 | `/api/v1/admin/questions` | GET/POST | 题目列表 + 新增 |
| 题库管理 | `/api/v1/admin/questions/{id}` | GET/PUT/DELETE | 题目详情/编辑/删除 |
| 批量导入 | `/api/v1/admin/questions/import` | POST | Excel/CSV 导入，含预检查 |
| 批量导出 | `/api/v1/admin/questions/export` | GET | 按条件导出 |
| 教程关联 | `/api/v1/admin/lessons/{id}/questions` | GET/POST | 教程-题目关联管理 |
| **诊断题管理**（v9.0 新增） | `/api/v1/admin/diagnostic-questions` 等 6 个端点 | GET/POST/PUT/DELETE | 详见 4.1 节 |
| **文件解析**（v9.0 新增） | `/api/v1/admin/lessons/parse-word`, `/parse-pdf` | POST | Word/PDF → Markdown |
| **RAG 管理**（v9.0 新增） | `/api/v1/admin/rag/*` 5 个端点 | GET/POST/DELETE | 详见 4.3 节 |

---

## 九、代码评测引擎

### 9.1 评测流程

1. 用户点击运行，前端将代码和关卡编号发送到后端
2. 后端查询该关卡的测试用例
3. 将用户代码与测试用例拼接
4. 通过 subprocess 启动子进程执行代码
5. 捕获标准输出、标准错误和返回码
6. 通过 `_smart_match` 智能比对实际输出与期望输出
7. 计算得分、评定星级（0-5 星）、增加 XP

### 9.2 多语言执行配置

| 语言 | 扩展名 | 执行命令 | 编译步骤 |
|------|--------|----------|---------|
| Python | .py | `python {file}` | 无 |
| JavaScript | .js | `node {file}` | 无 |
| Java | .java | `java -cp {dir} {classname}` | `javac -encoding UTF-8` |
| C | .c | `{output}` | `gcc -std=c11 -o` |
| C++ | .cpp | `{output}` | `g++ -std=c++17 -o` |
| TypeScript | .ts | `node {js_output}` | `tsc --target ES2020` |

### 9.3 智能比对

`_smart_match` 支持：精确匹配、数值近似（浮点误差 <0.0001）、子串匹配、空白归一化、numpy 前缀清洗。这些模式按优先级尝试，任一匹配即判定通过。

---

## 十、创新亮点

### 10.1 自研代码评测引擎

平台从零开发了一整套评测引擎，支持 6 种编程语言的编译和执行、智能输出匹配算法、多语言兼容性优化。评测完全不依赖 AI 大模型，评测逻辑可控、成本为零。

### 10.2 双轨降级 AI 错误分类

AI 错误分类采用"AI 主分类 + 规则降级"的双轨机制。AI 不可用时自动降级到规则关键词匹配，确保错题分类功能在任何情况下都不会完全失效。

### 10.3 规则驱动推荐系统

推荐系统基于知识掌握度的规则驱动算法，非黑盒机器学习模型。每一步推荐都可以解释原因，同时设计了完备的兜底策略。

### 10.4 六语言统一执行框架

通过 `language_config.py` 将 6 种语言的编译和执行命令抽象为统一配置。新增语言时只需添加配置项，无需修改评测流程代码。

### 10.5 机房部署优化

面向教育机房场景设计：学生端零配置（仅需浏览器），所有编程运行时由服务端统一维护。

### 10.6 神经元可视化

智能体工坊以神经元地图形式展示 8 条 AI 学习主线，92 个节点连线形成可视化学习路径。

### 10.7 教师创作工具 — 产品闭环

教师创作工具使产品从"内容固定"升级为"教师可自主创作"。教程（Markdown 编辑器）、题库（管理系统）、诊断题（v9.0 入库）均可由教师运营，形成完整教学闭环。这是产品进入学校场景并具备商业销售条件的核心能力。

### 10.8 本地化 RAG — 数据不出校（v9.0 新增）

RAG 基础设施采用 ChromaDB + SentenceTransformer 本地模型的组合，**零外部 API 依赖、零调用成本、内容数据不出校**。对教育客户的数据安全诉求而言，这是相对云端 Embedding API 的关键差异化优势。

### 10.9 数据源策略 — 从 Demo 到生产可用（v9.0 收口）

五类种子数据全部实现"仅首次初始化、教师修改优先、重启不覆盖"。教师可以完全信赖平台维护内容，产品具备真实教学场景的可用性。

### 10.10 渐进式交付策略

采用分步实施：Markdown 编辑器 → 题库管理 → 数据源策略 → 诊断题入库 → 文件导入 → RAG 基础设施。每一步做完都能独立使用，不需要等全部做完才有价值。

---

## 十一、产品路线图

| 优先级 | 模块 | 状态 | 说明 |
|:------:|------|:----:|------|
| 已完成 | 学生学习端（闯关、AI、评测、诊断、错题本、工坊、会员） | ✅ | 172 关、6 语言、4 种 AI 模式 |
| 已完成 | Markdown 教程编辑器 + 图片上传安全 | ✅ | 编辑器组件 + 上传 API |
| 已完成 | 题库管理系统（CRUD + 批量导入导出 + 教程关联） | ✅ | 预检查 + 事务入库 |
| 已完成 | 数据源策略（五类数据仅首次初始化） | ✅ v9.0 | lessons 收口完成 |
| 后端就绪 | 诊断题入库（模型 + 服务 + 6 个管理 API + 迁移 + seed） | 🔶 v9.0 | 管理界面建设中 |
| 后端就绪 | 文件导入解析（Word/PDF → Markdown） | 🔶 v9.0 | 编辑器导入按钮建设中 |
| 后端就绪 | RAG 基础设施（ChromaDB 索引 + 检索 + 5 个管理 API） | 🔶 v9.0 | AI 注入/隔离/前端为下一期 |
| 未完成 | 学生端渲染增强（highlight.js + GFM） | ❌ | 0.5 天工作量 |
| 未完成 | AST 知识点自动验证（仅 Python） | ❌ | 建议移出本期 |
| P2 | RAG 上下文注入 + 内容隔离 + 引用展示 | ⏳ | 下一期核心任务 |
| 不做 | 竞赛题库 RAG | ✖ 已否决 | 内容不匹配、版权风险、维护成本高 |

> 状态图例：✅ 完整交付 ｜ 🔶 后端已交付、前端接入中 ｜ ❌ 未开始 ｜ ⏳ 规划中

---

## 十二、启动与部署

### 环境要求

- Python 3.11+
- Node.js 20+

### 启动步骤

```bash
# 1. 启动后端（自动建表、执行种子数据、初始化 ChromaDB）
cd HelloWorld-api
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8006

# 2. 启动学习端
cd HelloWorld-web
npm install
npx vite --port 5173 --host

# 3. 启动管理后台
cd HelloWorld-admin-web
npm install
npm run dev
```

- 学习端地址：http://localhost:5173
- 管理后台地址：http://localhost:5174（管理员 admin/admin123）
- 演示账号：demo / demo123

### v9.0 部署注意事项

- 新增依赖后需重新 `pip install`（python-docx / PyMuPDF / chromadb / sentence-transformers）
- 首次使用 RAG 需调用 `POST /api/v1/admin/rag/index-all` 全量索引，向量数据持久化于 `HelloWorld-api/chroma_data/`
- SentenceTransformer 首次运行会下载 all-MiniLM-L6-v2 模型（约 90MB），离线部署需预下载
- 敏感信息：`.env` 中的 SECRET_KEY / ADMIN_PASSWORD / API_KEY 上线前必须修改

---

## 十三、团队分工

| 成员 | 角色 | 核心任务 |
|:----:|:----:|----------|
| **组长** | 项目统筹 | 系统架构设计、后端核心开发、答辩材料统筹 |
| **成员 A** | 后端核心 | 图片上传、题库数据库设计与迁移、Seed 逻辑改造、诊断题入库、Word/PDF 解析、RAG 后端 |
| **成员 B** | 管理后台前端 | Markdown 编辑器、题库管理页面、诊断题管理页面、文件导入前端、RAG 前端 |
| **成员 C** | 全栈集成 | 学生端渲染增强、AST 知识点分析、RAG 上下文注入、内容隔离 |
| **成员 D** | 测试与质量保障 | Embedding 验证、安全测试、集成测试、端到端验证、测试报告 |

---

## 十四、当前限制与已知问题

为保证文档与代码一致，如实披露以下边界：

| # | 事项 | 说明 |
|:-:|------|------|
| 1 | 诊断题/文件导入/RAG 三个新功能的**管理界面尚未接入** | 后端 API 完整可用，教师暂需通过 API 操作；DiagnosticManager.tsx、导入按钮、RAG 状态页为下一期前端任务 |
| 2 | RAG 未接入 AI 对话链路 | 当前 RAG 提供索引与检索 API，学生提问时 AI 尚未自动引用教程内容 |
| 3 | RAG 无多租户隔离 | 检索暂未按教师/学校过滤；单校演示可接受，多校销售前必须补 created_by 过滤 |
| 4 | 学生端代码块无语法高亮 | 教程代码块暂为纯文本渲染，highlight.js 集成为下一期任务 |
| 5 | AST 知识点自动验证未实现 | 知识点标签仍为人工标注（仅 Python 规划中） |
| 6 | 测试覆盖有限 | 自动化测试集中在推荐算法与图片上传安全（2 个测试文件），新功能测试用例建设中 |
| 7 | PDF 解析不承诺完整还原 | PDF 为行业性难题，解析结果供参考调整，Word 解析还原度较高 |
| 8 | SQLite 与单进程部署 | 适用于演示与小规模使用，规模化需迁移 PostgreSQL 并扩展部署方案 |
