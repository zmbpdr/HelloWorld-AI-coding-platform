# Hello World — 闯关式 AI 编程学习平台

> AI 智能体陪你闯关编程学习
> 版本 v3.0 | 2026-07-28

---

## 项目简介

**Hello World** 是一个基于 FastAPI + React 的闯关式 AI 编程学习平台。用户打开浏览器即可零配置开始编程学习，AI 智能体"小智"引导完成能力诊断，推荐合适起点关卡，在闯关中学习编程，提交代码后自动评测打分，错误代码自动记录到错题本，知识掌握度以可视化图表呈现。

**核心特色：**

- **AI 智能体** — 四种模式（诊断/导师/审查/规划），WebSocket 流式对话
- **能力诊断** — 注册后 10 道题诊断水平，推荐学习起点
- **知识掌握度** — 每次提交自动更新（加权平均算法），可视化画像
- **AI 错题本** — 自动记录错误，AI 分类+双轨降级，按类型追踪改进
- **6 种编程语言** — Python 34关 / JS 30关 / Java 30关 / C 20关 / C++ 28关 / TS 30关，共 172 关
- **智能体工坊** — 8 条 AI 学习主线，92 个节点，神经元地图可视化
- **代码评测引擎** — 自研，7 步流程，智能比对，多语言兼容优化
- **规则推荐算法** — 基于薄弱知识点，非 ML，可解释，含兜底策略

---

## 技术栈

| 层 | 技术 |
|:----:|------|
| **后端** | Python 3.11+ / FastAPI / SQLAlchemy 2.0 (异步) / Alembic / Uvicorn |
| **前端（学习端）** | React 19 / TypeScript / Vite 8 / TailwindCSS 4 / Monaco Editor / Chart.js / Zustand |
| **前端（管理后台）** | React 19 / TypeScript / Vite 8 / Ant Design 6 / Zustand |
| **AI 模型** | DeepSeek-V4-Flash（主用）/ Mock 降级 |
| **数据库** | SQLite + aiosqlite |
| **认证** | JWT Bearer Token / bcrypt |
| **代码执行** | subprocess 直接执行（6 语言编译+运行） |
| **HTTP 客户端** | httpx（后端）/ Axios（前端） |
| **WebSocket** | FastAPI WebSocket（AI 流式对话逐字推送） |

---

## 项目结构

```
Hello World/
├── HelloWorld-api/                # FastAPI 后端（Port 8006）
│   ├── app/
│   │   ├── main.py               # 应用入口（启动时自动建表+种数据）
│   │   ├── config.py             # 全局配置（pydantic-settings/.env）
│   │   ├── database.py           # SQLAlchemy 异步引擎
│   │   ├── core/                 # 安全/认证/中间件/限速/异常
│   │   ├── models/               # 18 张 ORM 数据表
│   │   ├── services/             # 14 个业务服务
│   │   ├── routers/              # 20 个路由模块
│   │   ├── judge/                # 代码评测配置（6语言）
│   │   └── schemas/              # Pydantic 数据模式
│   ├── scripts/                  # 工具脚本
│   └── requirements.txt
│
├── HelloWorld-web/                # 前端 - 学习端（Port 5173）
│   └── src/
│       ├── pages/                # 11 个页面
│       ├── components/           # 21 个组件
│       ├── api/                  # 9 个 API 调用文件
│       ├── stores/               # Zustand 状态管理
│       └── hooks/                # 4 个自定义 Hook
│
├── HelloWorld-admin-web/          # 前端 - 管理后台（Port 5174）
│
├── HelloWorld-content/            # 课程数据（JSON）
│   ├── lessons/                  # 6 种语言 172 关
│   └── agent/                    # 8 条主线 92 节点
│
├── .env                          # 环境变量配置（含 DeepSeek API Key）
├── API接口契约.md                 # 完整 API 文档
└── README.md                     # 本文件
```

---

## 启动指南

### 环境要求

- Python 3.11+
- Node.js 20+

### 第一步：后端启动

```bash
cd HelloWorld-api

# 安装 Python 依赖
pip install -r requirements.txt

# 启动后端（首次启动会自动创建数据库和种子数据）
uvicorn app.main:app --reload --port 8006
```

**后端地址：** http://localhost:8006
**API 文档：** http://localhost:8006/docs

### 第二步：学习端启动

```bash
cd HelloWorld-web

# 安装前端依赖
npm install

# 启动开发服务器
npx vite --port 5173 --host
```

**学习端地址：** http://localhost:5173

### 第三步：管理后台启动（可选）

```bash
cd HelloWorld-admin-web
npm install
npm run dev
```

**管理后台地址：** http://localhost:5174
**默认管理员：** `admin / admin123`（可在 `.env` 中修改）

### 演示账号

- 用户名：`demo`
- 密码：`demo123`
- 角色：Pro 会员，已有多项学习数据

---

## 环境变量

创建 `.env` 文件（可从 `.env.example` 复制），关键配置：

```env
# 数据库（默认 SQLite）
DATABASE_URL=sqlite+aiosqlite:///./HelloWorld.db

# 代码执行（直接 subprocess 执行）
ALLOW_DIRECT_EXECUTION=true

# AI 配置（DeepSeek API Key，可不填使用 Mock 模式）
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_MODEL=deepseek-v4-flash
AI_PROVIDER_PRIORITY=deepseek,mock

# 管理员账号
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# 功能开关
FEATURE_DIAGNOSTIC=true       # 能力诊断
FEATURE_KNOWLEDGE=true        # 知识掌握度
FEATURE_ERROR_BOOK=true       # 错题本
FEATURE_RECOMMEND=true        # 推荐算法
FEATURE_WEEKLY_REPORT=false   # 学习周报（默认关闭）
FEATURE_MEMBERSHIP=false      # 会员系统（默认关闭）
```

---

## 核心功能

### 闯关学习

6 种编程语言，共 172 道闯关关卡。每关包含标题、描述、难度、XP 奖励、起始代码、测试用例、提示、知识点标签。关卡采用顺序解锁机制（第 1 关始终可用，后续关卡必须前置通关后解锁）。完成后系统结算得分（0-5 星）并增加 XP，每 100 XP 升一级。

### 能力诊断

10 道硬编码选择题，覆盖 Python 核心知识点。纯代码评分（非 AI），0-100 分判定等级（入门级/进阶级/高级）并推荐学习起点。诊断结果存入数据库并在前端展示。

### AI 智能体"小智"

采用抽象工厂模式设计 AIProvider（DeepSeek/Mock 双提供者）。4 种角色模式：诊断（错误分析）、导师（启发式教学）、审查（四维雷达评分）、规划（方向推荐）。双层 Prompt 组合（模式级+语言级），WebSocket 流式对话逐字推送，对话历史数据库持久化。

### 代码评测引擎

7 步评测流程：提交→查用例→拼接→subprocess 执行→捕获输出→智能比对→评分加 XP。支持 6 种语言编译和执行，智能比对（精确/数值/子串/空白/numpy 清洗）。评测完全不依赖 AI，AI 仅在出错后做错误分类。

### 错题本与双轨降级

每次提交未满分时自动触发：AI 优先分类（syntax/logic/boundary/performance），AI 不可用时降级到规则关键词匹配。错题本支持按类型筛选、AI 分析展开、标记已解决、重新挑战。

### 知识掌握度与推荐

加权平均算法：新掌握度 = 当前得分 × 0.6 + 历史掌握度 × 0.4。规则驱动推荐：找薄弱标签→筛选关卡→排序推荐最多 3 条。新用户或无匹配时返回下一节顺序关卡兜底。

### 智能体工坊

8 条 AI 学习主线：ML、Agent 开发、大模型应用、综合项目、深度学习、NLP、CV、强化学习，共 92 个学习节点。神经元地图可视化，5 级能量评分系统。

### 管理后台

暗色主题，6 大模块：仪表盘、课程管理、用户管理、成就管理、提交审核、系统设置。三级权限（viewer/editor/admin），课程编辑支持知识标签/时长/前置依赖维护。

---

## 演示流程

```
1. 注册/登录（或使用 demo / demo123）
2. 课程大厅 → 能力诊断（10 道选择题）
3. 获取诊断结果 → 推荐起点关卡
4. 进入闯关 → Monaco 编辑器编写代码
5. 提交代码 → 评测引擎自动评分
6. 通过 → 更新知识掌握度，进入下一关
7. 失败 → 自动记录错题 + AI 错误分类
8. 查看错题本 → 按类型筛选 → AI 分析
9. 个人中心 → 知识画像 / 学习热力图 / 排行榜
10. 智能体工坊 → 神经元地图 → AI 主线学习
```

---

## 数据库

共 18 张表，以 SQLite 为存储引擎，通过 SQLAlchemy 异步 ORM 操作。

**核心表：** users（用户+会员）、languages（6 种语言）、lessons（172 关）、progress（学习进度）、submissions（提交记录）、user_diagnostics（诊断结果）、user_knowledge（知识掌握度）、user_errors（错题）、chat_histories（AI 对话历史）、neuron_nodes（92 个智能体节点）、code_snippets（代码收藏）、achievements（成就定义）、admin_users（管理员，三级角色）

---

## API 接口一览

> 完整契约见 [API接口契约.md](API接口契约.md)

| 类别 | 主要端点 |
|------|---------|
| 认证 | POST `/api/v1/auth/register`、`/login`、`/refresh` |
| 课程 | GET `/api/v1/languages`、`/languages/{slug}/map` |
| 课时 | GET `/api/v1/lessons/{id}`、POST `/lessons/{id}/submit`、GET `/lessons/recommend` |
| AI | POST `/api/v1/ai/chat`（四种模式）/ WS `/ai/chat/ws?token=` |
| 诊断 | GET/POST `/api/v1/diagnostic/questions`、`/submit`、`/result` |
| 错题 | GET `/api/v1/errors`、PATCH `/errors/{id}/resolve` |
| 知识 | GET `/api/v1/progress/knowledge`、`/users/me/activity` |
| 智能体 | GET `/api/v1/agent/map`、`/nodes/{id}`、POST `/nodes/{id}/submit` |
| 会员 | GET `/api/v1/users/me/membership`、POST `/users/me/upgrade` |

---

## 团队分工

| 成员 | 角色 | 核心任务 |
|:----:|:----:|----------|
| **组长** | 项目统筹 | 系统架构设计、后端核心开发、答辩材料统筹 |
| **成员 A** | 后端核心 | 数据库设计、能力诊断、代码评测引擎、知识掌握度、错题本、会员系统 |
| **成员 B** | AI 智能体 | AIProvider 抽象工厂、四种模式、双轨错误分类、WebSocket 流式对话 |
| **成员 C** | 前端开发 | 11 个页面开发、Monaco 编辑器、雷达图、AI 聊天、闯关地图动画 |
| **成员 D** | 内容与推荐 | 172 关课程内容、规则推荐算法、管理后台、课程元数据校验 |
