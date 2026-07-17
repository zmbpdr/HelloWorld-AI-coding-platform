# Hello World — 闯关式 AI 编程学习平台

> **AI 智能体陪你闯关编程学习**
> 版本 v2.0 | 2026-07-17

---

## 项目简介

**Hello World** 是一个基于 FastAPI + React 的闯关式 AI 编程学习平台。用户注册后由 AI 智能体"小智"引导完成能力诊断，根据诊断结果推荐合适的起点关卡，在闯关中学习编程，提交代码后 AI 自动审查评分，错误代码自动记录到错题本，知识掌握度以可视化图表呈现。

**核心特色：**
- 🤖 **AI 智能体** — 四种模式（诊断/导师/审查/规划），主动陪伴学习
- 🎯 **能力诊断** — 注册后 10 道题诊断水平，推荐起点
- 📊 **知识掌握度** — 每次提交自动更新，可视化画像
- 📝 **AI 错题本** — 自动记录错误，按类型分类，追踪改进
- 🎮 **6 种编程语言** — Python 24关 / JS 20关 / Java 20关 / C 10关 / C++ 18关 / TS 20关，共 112 关

---

## 技术栈

| 层 | 技术 |
|:----:|------|
| **后端** | Python 3.11+ / FastAPI / SQLAlchemy (异步) / aiosqlite |
| **前端（学习端）** | React 18 / TypeScript / Vite / TailwindCSS / Monaco Editor / Chart.js |
| **前端（管理后台）** | React 18 / TypeScript / Vite / Ant Design |
| **AI 模型** | DeepSeek-V4-Flash（主用）/ Ollama 降级 / Mock 兜底 |
| **数据库** | SQLite（开发）/ PostgreSQL（生产可选） |
| **认证** | JWT（PyJWT）/ bcrypt 密码哈希 |
| **代码执行** | subprocess 直接执行（无 Docker） |

---

## 启动指南

### D 模块文档

- [D 模块交付说明](docs/d-module.md)
- [课程内容与元数据规范](docs/course-content-spec.md)
- [推荐算法说明](docs/recommendation-algorithm.md)
- [测试报告](docs/test-report.md)
- [六语言环境依赖与判题说明](docs/language-runtime-and-judge.md)

### 环境要求

- Python 3.11+
- Node.js 20+

### 第一步：后端启动

```bash
cd codequest-api

# 安装 Python 依赖
pip install -r requirements.txt

# 如果遇到 bcrypt 版本问题，锁定版本：
# pip install bcrypt==4.2.1

# 启动后端（首次启动会自动创建数据库和种子数据）
uvicorn app.main:app --reload --port 8000
```

**后端地址：** http://localhost:8000
**API 文档：** http://localhost:8000/docs

### 第二步：前端（学习端）启动

```bash
cd codequest-web

# 安装前端依赖
npm install

# 启动开发服务器
npx vite --port 5173 --host

# （如果需要 Chart.js 雷达图，已包含在 package.json 中）
# npm install chart.js react-chartjs-2
```

**学习端地址：** http://localhost:5173

### 第三步：管理后台启动（可选）

```bash
cd codequest-admin-web
npm install
npm run dev
```

**管理后台地址：** http://localhost:5174
**默认管理员：** `admin / admin123`（可在 `.env` 中修改）

---

## 环境变量配置

创建 `.env` 文件（从 `.env.example` 复制），关键配置：

```env
# 数据库（默认 SQLite，无需额外配置）
DATABASE_URL=sqlite+aiosqlite:///./codequest.db

# 代码执行（无 Docker，直接使用 subprocess）
ALLOW_DIRECT_EXECUTION=true

# AI 配置（DeepSeek API Key，可选，Mock 模式可不填）
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_MODEL=deepseek-v4-flash
AI_PROVIDER_PRIORITY=deepseek,ollama,mock

# 管理员账号
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@helloworld.com
ADMIN_PASSWORD=admin123

# 功能开关
FEATURE_MEMBERSHIP=false    # 会员系统（默认关闭）
FEATURE_WEEKLY_REPORT=false # 学习周报（默认关闭）
```

---

## 项目结构

```
Hello World/
├── codequest-api/                # FastAPI 后端
│   ├── app/
│   │   ├── main.py               # 应用入口，路由注册
│   │   ├── config.py             # 全局配置（pydantic-settings）
│   │   ├── database.py           # 数据库连接
│   │   ├── core/                 # 核心模块
│   │   │   ├── security.py       # JWT + 密码哈希
│   │   │   ├── deps.py           # 依赖注入（用户认证 + AI配额）
│   │   │   ├── middleware.py     # 请求日志
│   │   │   ├── exceptions.py     # 全局异常处理
│   │   │   └── rate_limit.py     # 速率限制
│   │   ├── models/               # ORM 数据模型（14张表）
│   │   │   ├── user.py           # 用户表 + 会员字段
│   │   │   ├── course.py         # 语言表
│   │   │   ├── lesson.py         # 关卡表 + 知识标签
│   │   │   ├── diagnostic.py     # 能力诊断表
│   │   │   ├── knowledge.py      # 知识掌握度表
│   │   │   ├── error.py          # 错题本表
│   │   │   └── ...               # progress/submission/achievement 等
│   │   ├── services/             # 业务逻辑层
│   │   │   ├── ai_service.py     # AI 对话服务
│   │   │   ├── diagnostic_service.py  # 能力诊断逻辑
│   │   │   ├── knowledge_service.py   # 知识掌握度更新
│   │   │   ├── error_service.py       # 错题本服务
│   │   │   ├── judge_service.py       # 代码评测（已集成知识+错题）
│   │   │   └── seed_service.py        # 种子数据（6种语言）
│   │   ├── routers/              # API 路由
│   │   │   ├── diagnostic.py     # 诊断接口
│   │   │   ├── errors.py         # 错题本接口
│   │   │   ├── membership.py     # 会员接口
│   │   │   ├── progress.py       # 进度接口（含知识掌握度）
│   │   │   └── ...
│   │   └── judge/                # 代码评测配置
│   │       └── language_config.py    # 6种语言编译/运行命令
│   ├── judge/                    # 评测执行器
│   └── requirements.txt
│
├── codequest-web/                # 前端（学习端）
│   └── src/
│       ├── pages/
│       │   ├── Diagnostic.tsx    # 能力诊断页面
│       │   ├── ErrorBook.tsx     # 错题本页面
│       │   ├── Lobby.tsx         # 首页
│       │   ├── CourseMap.tsx     # 闯关地图
│       │   ├── Lesson.tsx        # 关卡页面
│       │   └── Profile.tsx       # 个人中心
│       └── components/
│           ├── CodeReviewPanel.tsx   # 代码审查雷达图
│           ├── KnowledgeChart.tsx    # 知识画像图表
│           └── chat/AIChat.tsx       # AI 聊天
│
├── codequest-admin-web/          # 前端（管理后台）
│
├── codequest-content/            # 课程数据
│   ├── lessons/                  # 6种语言关卡 JSON（共172关）
│   │   ├── python.json           # 34关
│   │   ├── javascript.json       # 30关
│   │   ├── java.json             # 30关
│   │   ├── c.json                # 20关
│   │   ├── cpp.json              # 28关
│   │   └── typescript.json       # 30关
│   └── agent/                    # 智能体工坊（8主线92节点）
│
├── scripts/
│   └── check_content.py          # 关卡内容完整性检查脚本
│
└── .env.example                  # 环境变量模板
```


---

## API 接口一览

### 认证
| 方法 | 路径 | 用途 |
|:----:|------|------|
| POST | `/api/v1/auth/register` | 用户注册 |
| POST | `/api/v1/auth/login` | 用户登录 |
| POST | `/api/v1/auth/refresh` | 刷新令牌 |

### 课程与关卡
| 方法 | 路径 | 用途 |
|:----:|------|------|
| GET | `/api/v1/languages` | 获取语言列表 |
| GET | `/api/v1/languages/{slug}` | 语言详情 |
| GET | `/api/v1/languages/{slug}/map` | 闯关地图（含解锁状态） |
| GET | `/api/v1/lessons/{id}` | 课时详情 |
| POST | `/api/v1/lessons/{id}/submit` | 提交代码评测 |
| GET | `/api/v1/lessons/{id}/stats` | 评测统计 |
| GET | `/api/v1/lessons/{id}/hint` | 获取提示 |
| GET | `/api/v1/lessons/recommend` | 推荐关卡 |

### AI 智能体
| 方法 | 路径 | 用途 |
|:----:|------|------|
| POST | `/api/v1/ai/chat` | AI 通用对话 |
| WS | `/ws/ai/chat` | AI 流式对话 |
| POST | `/api/v1/ai/diagnostic` | 代码诊断 |
| POST | `/api/v1/ai/tutor` | 导师指导 |
| POST | `/api/v1/ai/review` | 结构化代码审查（四维度评分） |
| POST | `/api/v1/ai/plan` | 学习规划 |
| POST | `/api/v1/ai/classify-error` | AI 错误分类 |
| GET | `/api/v1/ai/history` | 对话历史 |

### 诊断、错题与知识
| 方法 | 路径 | 用途 |
|:----:|------|------|
| GET | `/api/v1/diagnostic/questions` | 获取诊断题目 |
| POST | `/api/v1/diagnostic/submit` | 提交诊断答案 |
| GET | `/api/v1/diagnostic/result` | 查询诊断结果 |
| GET | `/api/v1/errors` | 获取错题列表 |
| PATCH | `/api/v1/errors/{id}/resolve` | 标记错题已解决 |
| GET | `/api/v1/progress/knowledge` | 获取知识掌握度 |

### 用户、成就与排行榜
| 方法 | 路径 | 用途 |
|:----:|------|------|
| GET | `/api/v1/users/me` | 获取当前用户信息 |
| GET | `/api/v1/users/me/stats` | 用户统计数据 |
| GET | `/api/v1/users/me/achievements` | 已解锁成就 |
| GET | `/api/v1/users/me/activity` | 90 天活动热力图 |
| GET | `/api/v1/achievements` | 成就列表 |
| GET | `/api/v1/leaderboard?period=` | 排行榜（week/month/all） |

### 代码收藏
| 方法 | 路径 | 用途 |
|:----:|------|------|
| GET | `/api/v1/snippets` | 获取收藏列表 |
| POST | `/api/v1/snippets` | 收藏代码 |
| DELETE | `/api/v1/snippets/{id}` | 删除收藏 |

### 智能体工坊
| 方法 | 路径 | 用途 |
|:----:|------|------|
| GET | `/api/v1/agent/map` | 神经元网络地图 |
| GET | `/api/v1/agent/nodes/{id}` | 节点详情 |
| POST | `/api/v1/agent/nodes/{id}/submit` | 提交代码评测 |
| GET | `/api/v1/agent/progress` | 用户进度 |
| GET | `/api/v1/agent/tracks` | 8 条主线概览 |

### 会员
| 方法 | 路径 | 用途 |
|:----:|------|------|
| POST | `/api/v1/user/upgrade` | 模拟会员升级 |
| GET | `/api/v1/user/membership` | 查询会员信息 |

---

## 演示流程

```
1. 注册/登录
2. AI 智能体"小智"打招呼 → 引导进入能力诊断
3. 完成 10 道选择题 → 生成能力画像（得分/强弱项/推荐起点）
4. 进入推荐关卡 → 在 Monaco 编辑器中编写代码
5. 提交代码 → AI 四维度审查+雷达图（正确性/可读性/效率/规范性）
6. 通过 → 更新知识掌握度，进入下一关
7. 失败 → 错误自动记录到错题本
8. 查看错题本 → 按类型筛选 → 标记已解决
9. 个人中心 → 查看知识掌握度画像，AI智能分析
10. 切换其他语言 → 6种语言全部可用
```

---

## 团队分工

| 成员 | 角色 | 核心任务 | 
|:----:|:----:|----------|
| **A** | 基础设施负责人 | P0修复 + 数据库建表 + 诊断/知识/错题后端 + 会员系统 | 
| **B** | AI 智能体负责人 | AIProvider工厂 + 四种模式 + 代码审查 + 错误分类 | 
| **C** | 前端页面负责人 | 品牌重命名 + 诊断/错题本页面 + 雷达图 + 知识图表 + AI聊天改造 |
| **D** | 内容与推荐负责人 | Python 24关打标签 + 推荐算法 + 管理后台改造 + 文档 | 


## 许可证

MIT
