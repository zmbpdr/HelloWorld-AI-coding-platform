# Hello World 架构设计文档

> 版本 v1.0 | 2026-07-14

---

## 1. 概述

Hello World 是一个**闯关式 AI 编程学习平台**，通过代码闯关获得 XP，集成 AI 导师和 Docker 沙箱。

两大学习板块：
- **编程闯关** — 14 门编程语言，258 个关卡
- **智能体工坊** — 8 条 AI/ML 学习主线，92 个神经元节点

### 技术栈

| 层 | 技术 |
|----|------|
| 后端 | FastAPI + SQLAlchemy 2.0 async + JWT + bcrypt |
| 学习前端 | React 19 + TypeScript + TailwindCSS 4 + Monaco Editor + Zustand |
| 管理前端 | React 19 + TypeScript + Ant Design 6 + Zustand |
| 数据库 | SQLite (dev) |
| AI | DeepSeek API → Ollama 降级 |
| 沙箱 | Docker 容器 (优先) / 直接执行 (需配置) |

---

## 2. 项目结构

```
闯关/
├── codequest-api/
│   ├── app/
│   │   ├── main.py / config.py / database.py
│   │   ├── models/               # user / course / lesson / progress / submission
│   │   │                         # achievement / agent / admin / snippet
│   │   ├── schemas/ / routers/ / services/ / core/
│   │   └── judge/                # language_config
│   └── alembic/
│
├── codequest-web/                # 学习前端
│   └── src/
│       ├── pages/                # Lobby / CourseMap / Lesson / Leaderboard
│       │                         # NeuralMap / AgentLesson / Profile / Settings
│       ├── components/           # auth / editor / chat / badge / ui / snippets
│       ├── api/ / hooks/ / stores/
│
├── codequest-admin-web/          # 管理后台
│   └── src/
│       ├── pages/                # Login / Dashboard / UserManager / LessonManager
│       │                         # LessonEditor / AchievementManager / SubmissionAudit / SystemSettings
│       ├── components/           # Layout / StatCard / TrendChart
│       └── api/ / stores/
│
├── codequest-content/
│   ├── lessons/                  # 14 语言 × 258 课时 JSON
│   └── agent/                    # 8 主线 × 92 节点 JSON
│
└── README.md
```

---

## 3. 数据模型

### 3.1 实体关系

```
User ──< Progress ──> Lesson ──< Language
  │       │
  │       └── Submission (lesson_id)
  ├──< UserAchievement ──> Achievement
  ├──< AgentProgress ──> NeuronNode
  └──< CodeSnippet
```

### 3.2 新增表

#### code_snippets（代码收藏）

| 列 | 类型 | 说明 |
|----|------|------|
| id | INTEGER PK | 自增 |
| user_id | FK → users | 用户 |
| title | VARCHAR(120) | 片段标题 |
| code | TEXT | 代码内容 |
| language | VARCHAR(30) | 编程语言 |
| tags | JSON | 标签列表 |
| lesson_id | FK → lessons | 来源关卡 |
| created_at | DATETIME | 创建时间 |

### 3.3 智能体工坊

```
neuron_nodes: id, title, slug, content, order, difficulty, xp_reward,
  track(ml|agent|llm|project|dl|nlp|cv|rl), section,
  starter_code, solution_code, test_cases(JSON), hint,
  prerequisites(JSON), energy_levels(JSON), is_active

agent_progress: id, user_id FK, node_id FK,
  status(in_progress|completed|mastered),
  energy_score(1-5), energy_detail(JSON),
  best_code, attempts, completed_at
  UNIQUE(user_id, node_id)
```

### 3.4 八条学习主线

| 主线 | 键 | 节点 | 描述 |
|------|-----|------|------|
| 机器学习 | ml | 8 | 数学基础 → 经典算法 |
| Agent开发 | agent | 28 | 工具调用 → 多智能体协作 |
| 大模型应用 | llm | 8 | Prompt → RAG |
| 综合项目 | project | 8 | 真实项目实战 |
| 深度学习 | dl | 12 | 神经网络 → Transformer |
| NLP | nlp | 10 | 文本预处理 → LLM微调 |
| 计算机视觉 | cv | 10 | 图像分类 → 目标检测 |
| 强化学习 | rl | 8 | Q-Learning → PPO |

---

## 4. API 设计

### 4.1 路由前缀

| 前缀 | 模块 |
|------|------|
| `/api/v1/auth` | 认证 (login/register/refresh) |
| `/api/v1` | 课程/课时/AI/成就/进度/排行榜/收藏/用户 |
| `/api/v1/agent` | 智能体工坊 (map/nodes/submit/progress/tracks) |
| `/api/v1/admin` | 管理后台 (dashboard/users/lessons/submissions/settings) |

### 4.2 全部端点

```
# 用户端
POST   /auth/register            # 注册
POST   /auth/login               # 登录
POST   /auth/refresh             # 刷新 Token
GET    /languages                # 14 语言列表
GET    /languages/{slug}         # 语言详情
GET    /languages/{slug}/map     # 闯关地图 (解锁状态)
GET    /lessons/{id}             # 课时内容
POST   /lessons/{id}/submit      # 代码提交评测
GET    /lessons/{id}/stats       # 评测统计 (耗时趋势+错误分布)
GET    /lessons/{id}/hint        # 获取提示
POST   /ai/chat                  # AI 对话
WS     /ws/ai/chat               # AI 流式对话
GET    /achievements             # 成就列表
GET    /users/me/stats           # 用户统计
GET    /users/me/achievements    # 已解锁成就
GET    /users/me/activity        # 90 天活跃度热力图
GET    /leaderboard?period=      # 排行榜 (week/month/all)
GET    /snippets?search=&tag=    # 收藏列表 (搜索+标签筛选)
POST   /snippets                 # 收藏代码
DELETE /snippets/{id}            # 删除收藏

# 智能体工坊
GET    /agent/map                # 神经元网络地图
GET    /agent/nodes/{id}         # 节点详情
POST   /agent/nodes/{id}/submit  # 提交评测
GET    /agent/progress           # 用户进度
GET    /agent/tracks             # 8 条主线概览
```

### 4.3 打分机制

```
得分 = 通过测试数 / 总测试数 × 100
星级: 0分→0★, 1-49→1★, 50-79→2★, 80-99→3★, 100→4★, 满分+<500ms→5★

评测: 语法检查 → 逐用例执行 → 6级匹配 → 返回结果
匹配: 精确 → 去空白 → 忽略大小写 → 包含 → 浮点近似 → 去所有空白
编码: Windows subprocess 二进制模式 + _safe_decode 处理 GBK 输出
```

---

## 5. 前端架构

### 5.1 路由

```
/                          Lobby (三标签首页)
/:languageSlug             CourseMap
/:languageSlug/:lessonId   Lesson
/workshop?track=ml         NeuralMap
/workshop/:nodeId          AgentLesson
/leaderboard               Leaderboard (总/月/周榜)
/profile /settings
```

### 5.2 标签系统 + 导航

```
Lobby 导航: [📌 收藏] [🏆 排行] [个人中心]

TabKey = 'languages' | 'workshop'

编程闯关 (</>) → 14语言卡片网格
智能体工坊 (🧠) → 8条主线卡片网格
```

### 5.3 核心功能组件

| 组件 | 位置 | 功能 |
|------|------|------|
| `LessonStats` | Lesson 导航栏 | 评测统计面板 (SVG 时间趋势 + 错误类型) |
| `ActivityHeatmap` | Lobby + Profile | GitHub 风格 90 天活跃度热力图 |
| `SnippetPanel` | Lobby 侧滑面板 | 代码收藏夹 (搜索/标签/展开/删除) |
| `StarBadge` | Lesson 结果区 | 星级评分 (0-5★) |
| `PageTransition` | 全局 | 页面淡入动画 |

### 5.4 管理后台

```
/login /dashboard /users /lessons /lessons/new /lessons/{id}/edit
/achievements /submissions /settings
```

---

## 6. 安全

```
请求 → CORS → JWT Bearer 验证 → 封禁检查 → 路由处理器
代码执行 → Docker 沙箱(优先) / 直接执行(需 ALLOW_DIRECT_EXECUTION=true)
异常 → 脱敏输出 + 完整日志
SQLite: PRAGMA foreign_keys = ON + cascade delete
编码: subprocess 二进制模式 + _safe_decode 多编码尝试
并发: Semaphore(10) + threading.Lock 沙箱检测
Token: refresh 校验 exp 过期 / int(user_id) 异常 → 401
```

---

## 7. 部署

### 开发环境

```bash
# 终端 1: 后端
cd codequest-api && uv run uvicorn app.main:app --host 0.0.0.0 --port 8006 --reload

# 终端 2: 学习前端 (代理 → 8006)
cd codequest-web && npx vite --port 5173 --host

# 终端 3: 管理后台 (代理 → 8006)
cd codequest-admin-web && npx vite --port 5174 --host
```

### 管理员

`admin / admin123` → http://localhost:5174

---

## 8. 已知限制

| 项目 | 说明 |
|------|------|
| 速率限制 | 内存实现，生产需 Redis |
| Windows 僵尸进程 | SO_REUSEADDR 导致端口占用不可杀 |
| Progress | 缺少 DB 层 UNIQUE 约束 |
| Windows 编码 | subprocess GBK 输出通过 _safe_decode 兼容 |

---

