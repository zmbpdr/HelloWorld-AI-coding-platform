# Hello World 项目完整结构树

> 每个文件的作用说明。标注 A 已修改/新建的文件。

---

## 项目根目录

```
d:\Desktop\coding_game\
│
├── .env.example                          # 环境变量模板（参考用）
├── .gitignore                            # Git 忽略规则
├── API接口契约.md                        # 10个接口的请求/响应格式定义（A 定稿）
├── README.md                             # 项目说明（D 待写）
├── requirements.txt                      # Python 依赖（项目根级别）
├── docker-compose.yml                    # Docker 编排（不再使用）
│
├── scripts/                              # ⚠ A 新建
│   └── check_content.py                  # ⚠ A 新建：关卡 JSON 完整性检查脚本
│
├── codequest-content/                    # 内容数据（JSON 格式）
│   ├── lessons/                          # 14种语言关卡文件
│   │   ├── python.json                   # Python 24关（D 需打标签，增加 knowledge_tags/estimated_minutes/prerequisites）
│   │   ├── python.json.bak               # Python 备份
│   │   ├── javascript.json               # JavaScript 20关
│   │   ├── typescript.json               # TypeScript 20关
│   │   ├── java.json                     # Java 20关
│   │   ├── cpp.json                      # C++ 18关
│   │   ├── go.json                       # Go 24关
│   │   ├── rust.json                     # Rust 24关
│   │   ├── kotlin.json                   # Kotlin 16关
│   │   ├── swift.json                    # Swift 16关
│   │   ├── ruby.json                     # Ruby 16关
│   │   ├── php.json                      # PHP 16关
│   │   ├── lua.json                      # Lua 14关
│   │   ├── sql.json                      # SQL 16关
│   │   └── shell.json                    # Shell 14关
│   └── agent/                            # 智能体工坊关卡（8个方向）
│       ├── ml.json                       # 机器学习
│       ├── deep_learning.json            # 深度学习
│       ├── reinforcement_learning.json   # 强化学习
│       ├── computer_vision.json          # 计算机视觉
│       ├── nlp.json                      # 自然语言处理
│       ├── agent_dev.json                # 智能体开发
│       ├── llm.json                      # 大语言模型
│       └── project.json                  # 综合项目
│
├── codequest-api/                        # 后端 FastAPI
│   ├── .env                              # ⚠ A 修改：环境变量（ALLOW_DIRECT_EXECUTION=true, DEEPSEEK_API_KEY=等）
│   ├── requirements.txt                  # Python 依赖
│   ├── Dockerfile                        # Docker 构建文件（不再使用）
│   ├── alembic.ini                       # 数据库迁移配置
│   ├── alembic/                          # 数据库迁移脚本
│   ├── judge/                            # 评测 Docker 沙箱（不再使用）
│   ├── tests/                            # 测试目录
│   │
│   └── app/                              # 应用主目录
│       ├── __init__.py
│       ├── config.py                     # ⚠ A 修改：全局配置（DEEPSEEK_MODEL, AI_PROVIDER_PRIORITY, ADMIN_*, 功能开关等）
│       ├── database.py                   # 数据库连接（SQLite + aiosqlite）
│       ├── main.py                       # ⚠ A 修改：应用入口，标题 "Hello World API"，注册路由
│       │
│       ├── models/                       # ORM 数据模型
│       │   ├── __init__.py               # ⚠ A 修改：导入所有模型（新增 UserDiagnostic/UserKnowledge/UserError）
│       │   ├── user.py                   # ⚠ A 修改：User 模型，新增 membership/ai_usage_today/ai_usage_date + 3个关系
│       │   ├── lesson.py                 # ⚠ A 修改：Lesson 模型，新增 knowledge_tags/estimated_minutes/prerequisites
│       │   ├── diagnostic.py             # ⚠ A 新建：UserDiagnostic 模型（能力诊断结果）
│       │   ├── knowledge.py              # ⚠ A 新建：UserKnowledge 模型（知识点掌握度，联合唯一约束）
│       │   ├── error.py                  # ⚠ A 新建：UserError 模型（错题记录）
│       │   ├── course.py                 # Language 模型（语言/课程）
│       │   ├── progress.py               # Progress 模型（学习进度）
│       │   ├── submission.py             # Submission 模型（代码提交）
│       │   ├── achievement.py            # Achievement + UserAchievement 模型
│       │   ├── agent.py                  # NeuronNode + AgentProgress 模型（智能体工坊）
│       │   ├── snippet.py                # CodeSnippet 模型（代码收藏）
│       │   ├── admin.py                  # AdminUser + SystemSettings 等管理后台模型
│       │   └── enums.py                  # 枚举类型（SubmissionStatus, ProgressStatus 等）
│       │
│       ├── schemas/                      # Pydantic 请求/响应模型
│       │   ├── __init__.py
│       │   ├── user.py                   # 用户相关 Pydantic 模型
│       │   ├── course.py                 # 课程相关 Pydantic 模型
│       │   ├── ai.py                     # AI 对话 Pydantic 模型
│       │   ├── agent.py                  # 智能体工坊 Pydantic 模型
│       │   └── admin.py                  # 管理后台 Pydantic 模型
│       │
│       ├── services/                     # 业务逻辑层
│       │   ├── __init__.py
│       │   ├── seed_service.py           # ⚠ A 修改：种子数据初始化（补全14种语言 + Lesson读取新字段）
│       │   ├── judge_service.py          # ⚠ A 修改：代码评测（集成知识更新 + 错题保存）
│       │   ├── diagnostic_service.py     # ⚠ A 新建：能力诊断（10道题 + 计分 + upsert）
│       │   ├── knowledge_service.py      # ⚠ A 新建：知识掌握度（加权计算 + 查询）
│       │   ├── error_service.py          # ⚠ A 新建：错题本（规则分类 + CRUD + 统计）
│       │   ├── ai_service.py             # B 需重写：AI 对话（当前硬编码 Ollama）
│       │   ├── course_service.py         # 课程服务（语言列表、关卡地图）
│       │   ├── achievement_service.py    # 成就服务
│       │   ├── agent_service.py          # 智能体工坊服务
│       │   └── admin_service.py          # 管理后台服务
│       │
│       ├── routers/                      # API 路由
│       │   ├── __init__.py
│       │   ├── auth.py                   # 认证路由（注册/登录/刷新令牌）
│       │   ├── courses.py                # 课程路由（语言大厅）
│       │   ├── lessons.py                # 课时路由（D 需新增 GET /lessons/recommend）
│       │   ├── diagnostic.py             # ⚠ A 新建：诊断路由（3个接口）
│       │   ├── errors.py                 # ⚠ A 新建：错题路由（2个接口）
│       │   ├── progress.py               # ⚠ A 修改：进度路由（新增 GET /progress/knowledge）
│       │   ├── submissions.py            # 提交路由
│       │   ├── ai.py                     # B 需修改：AI 路由（新增 review + classify-error）
│       │   ├── achievements.py           # 成就路由
│       │   ├── leaderboard.py            # 排行榜路由
│       │   ├── agent.py                  # 智能体工坊路由
│       │   ├── snippets.py               # 代码收藏路由
│       │   │
│       │   └── admin/                    # 管理后台路由
│       │       ├── __init__.py
│       │       ├── auth.py               # 管理后台认证
│       │       ├── dashboard.py          # 仪表盘
│       │       ├── lessons.py            # 关卡管理
│       │       ├── users.py              # 用户管理
│       │       ├── submissions.py        # 提交审计
│       │       ├── achievements.py       # 成就管理
│       │       └── settings.py           # 系统设置
│       │
│       ├── core/                         # 核心基础设施
│       │   ├── __init__.py
│       │   ├── deps.py                   # 依赖注入（JWT 获取当前用户）
│       │   ├── admin_deps.py             # 管理后台依赖注入
│       │   ├── security.py               # 安全模块（JWT + 密码哈希）
│       │   ├── exceptions.py             # 全局异常处理
│       │   ├── middleware.py             # 请求日志中间件
│       │   └── rate_limit.py             # 速率限制
│       │
│       ├── judge/                        # 代码评测引擎
│       │   └── language_config.py        # 14种语言的编译/运行命令
│       │
│       └── utils/                        # 工具函数
│           └── __init__.py
│
├── codequest-web/                        # 前端（用户端）React + Vite + TailwindCSS
│   ├── index.html                        # C 需修改：<title> 改为 "Hello World"
│   ├── package.json
│   ├── vite.config.ts
│   │
│   └── src/
│       ├── main.tsx                      # React 入口
│       ├── App.tsx                       # C 需修改：新增 /diagnostic、/errors 路由
│       ├── index.css                     # C 需修改：全局配色改为蓝白风
│       │
│       ├── api/                          # API 调用层
│       │   ├── client.ts                 # axios 实例
│       │   ├── auth.ts                   # 认证 API
│       │   ├── auth.types.ts             # 认证类型
│       │   ├── courses.ts                # 课程 API
│       │   ├── courses.types.ts          # 课程类型
│       │   ├── lessons.ts                # 课时 API
│       │   ├── user.ts                   # 用户 API
│       │   ├── ai.ts                     # AI 对话 API
│       │   └── agent.ts                  # 智能体工坊 API
│       │
│       ├── stores/                       # 状态管理（Zustand）
│       │   ├── userStore.ts              # 用户状态
│       │   └── courseStore.ts            # 课程状态
│       │
│       ├── hooks/                        # 自定义 Hooks
│       │   ├── useAI.ts                  # AI 对话 Hook
│       │   ├── useCodeRunner.ts          # 代码运行 Hook
│       │   ├── useAgentRunner.ts         # 智能体运行 Hook
│       │   └── useComboStreak.tsx        # 连击状态 Hook
│       │
│       ├── pages/                        # 页面组件
│       │   ├── Lobby.tsx                 # C 需修改：首页增加智能体欢迎语 + 推荐
│       │   ├── CourseMap.tsx             # C 需修改：闯关地图增加推荐标记
│       │   ├── Lesson.tsx                # C 需修改：集成 CodeReviewPanel
│       │   ├── Profile.tsx               # C 需修改：集成 KnowledgeChart + 错题入口
│       │   ├── Leaderboard.tsx           # 排行榜（不改）
│       │   ├── Settings.tsx              # 设置（不改）
│       │   ├── NeuralMap.tsx             # 智能体工坊地图（不改）
│       │   ├── AgentLesson.tsx           # 智能体工坊关卡（不改）
│       │   ├── Diagnostic.tsx            # C 需新建：能力诊断页面
│       │   └── ErrorBook.tsx             # C 需新建：错题本页面
│       │
│       ├── components/                   # 可复用组件
│       │   ├── auth/                     # 认证组件
│       │   │   ├── AuthModal.tsx         # 认证弹窗
│       │   │   ├── LoginForm.tsx         # 登录表单
│       │   │   ├── RegisterForm.tsx      # 注册表单
│       │   │   └── RequireAuth.tsx       # 鉴权包装
│       │   ├── editor/
│       │   │   └── CodeEditor.tsx        # Monaco Editor（不改）
│       │   ├── chat/
│       │   │   └── AIChat.tsx            # C 需修改：模式切换 + 智能体 UI
│       │   ├── snippets/
│       │   │   └── SnippetPanel.tsx      # 代码收藏面板（不改）
│       │   ├── badge/
│       │   │   ├── AchievementCard.tsx   # 成就卡片（不改）
│       │   │   ├── AchievementToast.tsx  # 成就弹窗（不改）
│       │   │   ├── ChessPiece.tsx        # 等级棋子（不改）
│       │   │   └── StarBadge.tsx         # 星级徽章（不改）
│       │   ├── ui/
│       │   │   ├── Button.tsx            # 通用按钮（不改）
│       │   │   ├── Input.tsx             # 通用输入框（不改）
│       │   │   ├── CelebrationEffect.tsx # 庆祝特效（不改）
│       │   │   ├── ActivityHeatmap.tsx   # 活动热力图（不改）
│       │   │   ├── LessonStats.tsx       # 课时统计（不改）
│       │   │   └── PageTransition.tsx    # 页面过渡（不改）
│       │   ├── CodeReviewPanel.tsx       # C 需新建：代码审查面板（雷达图+问题列表）
│       │   └── KnowledgeChart.tsx        # C 需新建：知识掌握度条形图
│       │
│       ├── utils/
│       │   └── markdown.ts               # Markdown 渲染
│       └── assets/
│           ├── hero.png
│           ├── react.svg
│           └── vite.svg
│
├── codequest-admin-web/                  # 前端（管理后台）React + Vite + Ant Design
│   ├── index.html                        # C 需修改：<title> 改为 "Hello World - 管理后台"
│   ├── package.json
│   ├── vite.config.ts
│   │
│   └── src/
│       ├── main.tsx                      # 入口
│       ├── App.tsx                       # 根组件
│       ├── index.css                     # 全局样式
│       │
│       ├── api/
│       │   ├── client.ts                 # axios 实例
│       │   └── admin.ts                  # 管理后台 API
│       │
│       ├── stores/
│       │   └── adminStore.ts             # 管理后台状态
│       │
│       ├── pages/
│       │   ├── Login.tsx                 # 管理员登录
│       │   ├── Dashboard.tsx             # 仪表盘
│       │   ├── LessonManager.tsx         # D 需修改：增加标签管理字段
│       │   ├── LessonEditor.tsx          # 关卡编辑器
│       │   ├── UserManager.tsx           # 用户管理
│       │   ├── SubmissionAudit.tsx       # 提交审计
│       │   ├── AchievementManager.tsx    # 成就管理
│       │   └── SystemSettings.tsx        # 系统设置
│       │
│       └── components/
│           ├── Layout.tsx                # 布局组件
│           ├── StatCard.tsx              # 统计卡片
│           └── TrendChart.tsx            # 趋势图表
│
├── notebooks/                            # Jupyter Notebooks
│   └── README.md
│
└── 文档/                                 # 项目文档
    ├── 00_执行总览_先读我.md              # 项目全局概览
    ├── 01_参考代码结构速查.md              # 参考代码目录和已知 Bug
    ├── 02_P0修复清单.md                   # 6项 P0 修复（A 已全部完成）
    ├── 03_AI智能体实现指南.md              # B 的 AI 实现方案
    ├── 04_后端新增功能实现指南.md           # A 和 D 的后端实现方案
    ├── 05_前端改造实现指南.md              # C 的前端改造方案
    ├── 06_API接口契约.md                  # 所有接口定义（A 已定稿）
    ├── 07_数据库表设计.md                  # 新增3张表 + 修改2张表
    ├── 08_风险与降级方案.md                # 风险与降级策略
    ├── 09_分步执行顺序.md                  # 三周每天计划
    └── 10_各角色详细任务与产出清单.md       # 各角色任务清单
```

---

## 图例

| 标记 | 含义 |
|:----:|------|
| ⚠ A 新建 | A 在本轮对话中新建的文件 |
| ⚠ A 修改 | A 在本轮对话中修改的文件 |
| B 需重写 | B 需要重写的文件 |
| B 需修改 | B 需要修改的文件 |
| C 需修改 | C 需要修改的文件 |
| C 需新建 | C 需要新建的文件 |
| D 需修改 | D 需要修改的文件 |
| 不改 | 参考代码已有，完整可用 |

---

## A 的产出汇总

| 类型 | 数量 | 文件列表 |
|:----:|:----:|------|
| 新建 models | 3 | `diagnostic.py`, `knowledge.py`, `error.py` |
| 新建 services | 3 | `diagnostic_service.py`, `knowledge_service.py`, `error_service.py` |
| 新建 routers | 2 | `diagnostic.py`, `errors.py` |
| 新建 scripts | 1 | `check_content.py` |
| 修改 models | 3 | `__init__.py`, `user.py`, `lesson.py` |
| 修改 services | 2 | `seed_service.py`, `judge_service.py` |
| 修改 routers | 1 | `progress.py` |
| 修改 config | 2 | `main.py`, `config.py`, `.env` |