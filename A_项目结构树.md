# Hello World 项目完整结构树

> 每个文件的作用说明。基于 v2.0 当前代码。

---

## 项目根目录

```
Hello World/
│
├── .env / .env.example              # 环境变量配置（DeepSeek API Key、数据库路径、功能开关等）
├── .gitignore                       # Git 忽略规则
├── docker-compose.yml               # Docker 编排（生产环境）
├── README.md                        # 项目说明文档
├── 作品说明文档.md                   # 中文作品说明
├── API接口契约.md                   # 37 个 API 接口请求/响应格式
├── A_项目结构树.md                   # 本文件
├── CodeQuest_Architecture_Design.md # 架构设计文档
│
├── codequest-api/                   # FastAPI 后端
│   ├── .env                         # 本地环境变量
│   ├── requirements.txt             # Python 依赖
│   ├── Dockerfile                   # API 容器镜像
│   ├── alembic.ini                  # 数据库迁移配置
│   ├── alembic/                     # 迁移脚本
│   ├── judge/                       # Docker 沙箱执行器 + 各语言环境 Dockerfile
│   ├── tests/                       # 测试目录
│   ├── scripts/                     # 校验/构建脚本
│   │   ├── check_six_language_content.py  # 172 关完整性校验
│   │   └── build_six_language_content.py  # 课程元数据构建
│   │
│   └── app/                         # 应用主目录
│       ├── __init__.py
│       ├── main.py                  # FastAPI 入口，lifespan 管理，路由注册
│       ├── config.py                # 全局配置（pydantic-settings），DB 路径自动修正
│       ├── database.py              # SQLAlchemy 2.0 异步引擎 + 会话管理
│       │
│       ├── models/                  # 13 个 ORM 模型
│       │   ├── user.py              # 用户（含 membership/ai_usage 字段）
│       │   ├── course.py            # 语言/课程
│       │   ├── lesson.py            # 关卡（含 knowledge_tags/estimated_minutes/prerequisites）
│       │   ├── progress.py          # 学习进度
│       │   ├── submission.py        # 代码提交
│       │   ├── achievement.py       # 成就 + 用户成就
│       │   ├── agent.py             # 智能体节点 + 进度
│       │   ├── snippet.py           # 代码收藏
│       │   ├── diagnostic.py        # 能力诊断
│       │   ├── knowledge.py         # 知识掌握度
│       │   ├── error.py             # 错题本
│       │   ├── admin.py             # 管理后台（AdminUser/SystemSettings/UserStatsDaily）
│       │   └── enums.py             # 枚举常量
│       │
│       ├── routers/                 # 14 个路由模块
│       │   ├── auth.py              # 认证（register/login/refresh）
│       │   ├── courses.py           # 语言列表 + 闯关地图
│       │   ├── lessons.py           # 课时详情/提交评测/提示/统计
│       │   ├── ai.py                # AI 四模式 + 通用聊天 + 错误分类 + 流式对话
│       │   ├── agent.py             # 智能体工坊（地图/节点/提交/进度/主线）
│       │   ├── progress.py          # 用户统计/知识掌握度/活动热力图
│       │   ├── leaderboard.py       # 排行榜
│       │   ├── achievements.py      # 成就
│       │   ├── submissions.py       # 提交记录
│       │   ├── snippets.py          # 代码收藏
│       │   ├── diagnostic.py        # 能力诊断（3 个接口）
│       │   ├── errors.py            # 错题本（列表/解决）
│       │   ├── membership.py        # 会员（升级/查询）
│       │   └── admin/               # 管理后台（7 个子路由）
│       │
│       ├── services/                # 13 个业务服务
│       │   ├── judge_service.py     # 评测引擎（6 级匹配 + C/Python 特化 + 编码兼容）
│       │   ├── ai_service.py        # AIProvider 工厂（DeepSeek/Mock）+ 四模式 + 流式 + 错误分类
│       │   ├── agent_service.py     # 智能体工坊（节点评测 + 四维能量评级）
│       │   ├── seed_service.py      # 种子数据（6 语言 172 关 + 增量同步）
│       │   ├── knowledge_service.py # 知识掌握度（加权平滑更新）
│       │   ├── error_service.py     # 错题本（AI 分类 + 规则降级）
│       │   ├── diagnostic_service.py # 能力诊断
│       │   ├── course_service.py    # 课程服务
│       │   ├── achievement_service.py # 成就服务
│       │   ├── membership_service.py  # 会员配额
│       │   ├── recommendation_service.py # 推荐
│       │   └── admin_service.py     # 管理后台
│       │
│       ├── core/                    # 基础设施
│       │   ├── security.py          # JWT + bcrypt
│       │   ├── deps.py              # 依赖注入（get_current_user/get_optional_user）
│       │   ├── admin_deps.py        # 管理员依赖
│       │   ├── middleware.py        # 请求日志
│       │   ├── rate_limit.py        # 速率限制
│       │   └── exceptions.py        # 全局异常处理
│       │
│       ├── schemas/                 # Pydantic 请求/响应
│       │   ├── ai.py                # ChatRequest / AIActionRequest / ReviewResponse / TutorResponse
│       │   ├── auth.py / course.py / agent.py / user.py / admin.py
│       │
│       └── judge/                   # 评测配置
│           └── language_config.py   # 6 语言编译/运行命令 + Java 路径自动查找
│
├── codequest-web/                   # 学习前端
│   ├── index.html                   # 入口 HTML
│   ├── package.json                 # 依赖（React 19 / Monaco / Chart.js / Zustand 等）
│   ├── vite.config.ts               # Vite 配置
│   │
│   └── src/
│       ├── main.tsx / App.tsx / index.css
│       │
│       ├── pages/                   # 11 个页面
│       │   ├── Lobby.tsx            # 首页大厅（语言卡片 + agent 卡片 + 热力图）
│       │   ├── CourseMap.tsx        # 闯关地图（棋子动画 + 推荐标记）
│       │   ├── Lesson.tsx           # 关卡（Monaco 编辑器 + AI 四模式分析按钮）
│       │   ├── NeuralMap.tsx        # 神经元网络（进度条 + 状态流转）
│       │   ├── AgentLesson.tsx      # 智能体关卡（能量评级雷达图）
│       │   ├── Leaderboard.tsx      # 排行榜
│       │   ├── Profile.tsx          # 个人中心（知识画像 + AI 分析按钮）
│       │   ├── Settings.tsx         # 设置
│       │   ├── Diagnostic.tsx       # 能力诊断页面
│       │   ├── Errors.tsx           # 错题本页面
│       │   └── Pricing.tsx          # 会员定价
│       │
│       ├── components/              # 可复用组件
│       │   ├── chat/AIChat.tsx      # AI 悬浮球（四模式切换 + 可拖拽）
│       │   ├── editor/CodeEditor.tsx # Monaco 编辑器
│       │   ├── auth/                # AuthModal / LoginForm / RegisterForm / RequireAuth
│       │   ├── badge/               # AchievementCard / Toast / ChessPiece / StarBadge
│       │   ├── ui/                  # ActivityHeatmap / LessonStats / PageTransition / Button / Input
│       │   ├── snippets/SnippetPanel.tsx  # 代码收藏面板
│       │   ├── map/                 # 闯关地图组件
│       │   └── RadarChart.tsx       # 审查雷达图
│       │
│       ├── api/                     # Axios API 层
│       │   ├── client.ts            # 基础实例（baseURL / token 注入 / 401 拦截 / 30s 超时）
│       │   ├── auth.ts / courses.ts / lessons.ts / ai.ts / agent.ts / user.ts
│       │
│       ├── hooks/                   # 自定义 Hooks
│       │   ├── useCodeRunner.ts     # 代码提交
│       │   ├── useAI.ts             # AI 对话（四模式支持）
│       │   ├── useAgentRunner.ts    # 智能体提交
│       │   └── useComboStreak.tsx   # 连击
│       │
│       ├── stores/                  # Zustand 状态管理
│       │   ├── courseStore.ts       # 课程状态
│       │   └── userStore.ts         # 用户认证状态
│       │
│       └── utils/markdown.ts        # Markdown 渲染
│
├── codequest-admin-web/             # 管理后台
│   ├── index.html / package.json / vite.config.ts
│   └── src/
│       ├── pages/                   # 8 个管理页面
│       │   ├── Login.tsx / Dashboard.tsx / UserManager.tsx
│       │   ├── LessonManager.tsx / LessonEditor.tsx
│       │   ├── AchievementManager.tsx / SubmissionAudit.tsx / SystemSettings.tsx
│       ├── components/              # Layout / StatCard / TrendChart
│       ├── api/ / stores/
│
├── codequest-content/               # 静态课程数据
│   ├── lessons/                     # 6 语言 × 172 关 JSON
│   │   ├── python.json (34) / javascript.json (30) / java.json (30)
│   │   ├── c.json (20) / cpp.json (28) / typescript.json (30)
│   │   └── go.json / rust.json / kotlin.json / swift.json / ruby.json / php.json / lua.json / sql.json / shell.json
│   ├── agent/                       # 8 主线 × 92 节点 JSON
│   │   ├── ml.json / deep_learning.json / reinforcement_learning.json
│   │   ├── nlp.json / computer_vision.json
│   │   ├── agent_dev.json / llm.json / project.json
│   └── ai_prompts.json             # 6 语言 tutor/reviewer Prompt
│
├── docs/                            # 开发文档
│   ├── d-module.md / course-content-spec.md
│   ├── recommendation-algorithm.md / language-runtime-and-judge.md / test-report.md
│
└── scripts/
    └── check_content.py             # 课程内容检查

```
