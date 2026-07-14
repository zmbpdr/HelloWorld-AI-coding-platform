# CodeQuest — 闯关式 AI 编程学习平台

交互式编程学习平台，通过代码闯关获得经验值。集成 AI 导师、Docker 沙箱安全执行和智能体工坊。

> 版本 v6.0 | 2026-06-01

---

## 快速开始

### 环境要求

- Python 3.11+ / Node.js 20+
- Docker Desktop（可选，代码沙箱）

### 启动

```bash
# 终端 1: 后端
cd codequest-api && uvicorn app.main:app --host 0.0.0.0 --port 8006 --reload

# 终端 2: 学习前端
cd codequest-web && npx vite --port 5173 --host

# 终端 3: 管理后台
cd codequest-admin-web && npx vite --port 5174 --host
```

| 服务 | 地址 |
|------|------|
| 学习平台 | http://localhost:5173 |
| 管理后台 | http://localhost:5174 |
| 后端 API | http://localhost:8006/docs |

管理后台 `admin / admin123`

---

## 两大学习板块

### 编程闯关

14 门编程语言，258 个关卡。Monaco 代码编辑器 + 智能评测 + AI 导师分析。

| 语言 | 课时 |
|------|------|
| Python / JavaScript / Java / C++ | 24 / 20 / 20 / 18 |
| Go / Rust / TypeScript / SQL | 24 / 24 / 20 / 16 |
| Ruby / Swift / Kotlin / PHP | 16 / 16 / 16 / 16 |
| Shell / Lua | 14 / 14 |

### 智能体工坊

8 条 AI/ML 学习主线，92 个神经元节点，能量评级系统。

| 主线 | 节点 | 方向 |
|------|------|------|
| 机器学习 / 深度学习 | 8 / 12 | 数学基础 → Transformer |
| Agent开发 / 大模型应用 | 28 / 8 | 工具调用 → RAG |
| 自然语言处理 / 计算机视觉 / 强化学习 | 10 / 10 / 8 | 专业方向 |
| 综合项目 | 8 | 真实项目实战 |

---

## 项目结构

```
闯关/
├── codequest-api/          # FastAPI 后端
├── codequest-web/          # 学习前端 (React + TailwindCSS + Monaco)
├── codequest-admin-web/    # 管理后台 (React + Ant Design 6)
├── codequest-content/      # 课程数据 (lessons/ + agent/)
├── docker-compose.yml
└── CodeQuest_Architecture_Design.md
```

---

## 核心功能

| 功能 | 说明 |
|------|------|
| 代码评测 | 6 级匹配，部分通过按比例得分，14 语言支持 |
| AI 导师 | DeepSeek + Ollama 双后端，错误分析 + 修改建议 |
| 成就系统 | 4 级稀有度，多种成就类型 |
| 能量评级 | 理解力/实现力/优化力/创造力 四维评分 |
| Docker 沙箱 | no-network, read-only root, 256MB, tmpfs |
| 代码收藏 | ⭐ 一键收藏 + 标签分类 + 搜索 |
| 排行榜 | 总榜/月榜/周榜 + 🥇🥈🥉 奖牌 |
| 学习热力图 | GitHub 风格 90 天活跃度可视化 |
| 评测统计 | 每道题的耗时趋势 + 错误类型分布 |
| 管理后台 | 仪表盘、用户管理、课程 CRUD、提交审计 |

---

## 安全

- 代码执行沙箱优先，直接执行需显式配置
- bcrypt 密码哈希 + JWT 认证
- 被封禁用户登录拦截
- 异常脱敏 + 完整日志
- SQLite PRAGMA foreign_keys = ON
- 速率限制 (login/register/submit/AI)

## 许可证

MIT
