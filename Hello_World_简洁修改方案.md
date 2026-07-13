# Hello World 简洁修改方案

> 基于参考代码二次开发 | 4 人 | 3 周 | 不部署 Docker | 创新聚焦 Python 闯关

---

## 一、基础数据

- JSON 文件：14 种语言，258 关（已验证）
- 当前代码 Bug：`seed_service.py` 只初始化了 4 种语言，其余 10 种有 JSON 但无法导入，需修复

---

## 二、完全不改（照搬）

| 模块 | 说明 |
|------|------|
| 用户注册/登录 | JWT 认证，直接使用 |
| 代码编辑器 | Monaco Editor，直接使用 |
| 排行榜 | 总榜/月榜/周榜，直接使用 |
| 成就系统 | 4 级稀有度，直接使用 |
| 学习热力图 | 直接使用 |
| 代码收藏 | 直接使用 |
| 14 种语言关卡 JSON | 题目、测试用例、参考答案，全部直接使用 |
| 智能体工坊 | 8 主线 92 节点，直接使用 |
| 代码评测基础逻辑 | 编译、运行、比对测试用例，直接使用 |

---

## 三、小改动（Bug 修复 + 必要调整）

| 序号 | 改动项 | 改什么 | 为什么 |
|:----:|--------|--------|--------|
| 1 | 补全 14 种语言初始化 | `seed_service.py` 的 `LANGUAGES_DATA`，从 4 种补到 14 种 | 不补的话，另外 10 种语言的 176 关永远用不了 |
| 2 | 管理员密码改为读 `.env` | `seed_service.py` 第 91 行，从 `.env` 读 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD` | 原代码硬编码 `admin/admin123` |
| 3 | 代码执行去掉 Docker | `.env` 设 `ALLOW_DIRECT_EXECUTION=true` | 无需 Docker 即可执行用户代码 |
| 4 | 管理后台新增标签管理 | `LessonManager.tsx` 增加知识点标签编辑入口 | 支持 Python 关卡打标签 |

---

## 四、大改动（核心创新，聚焦 Python 闯关）

### 4.1 AI 智能体"小智"

**改造方式：** 重写 `ai_service.py`。

**现状：** 硬编码调用 Ollama 本地模型 `qwen2.5:7b`，单一聊天框。

**改为：** `AIProvider` 抽象工厂模式。

```
调用优先级：DeepSeek API → Ollama 降级 → Mock 兜底
```

**模型：** DeepSeek API（`deepseek-chat`），云端调用，无需本地下载模型，JSON 格式输出稳定，中文能力强。

**智能体四种模式：**

| 模式 | 何时触发 | System Prompt 要点 |
|------|----------|-------------------|
| 诊断模式 | 注册后首次使用 | 出题测试用户水平，判断强弱项，推荐起点 |
| 导师模式 | 学习中卡住时 | 只给渐进式提示，不给完整答案 |
| 审查模式 | 提交代码后 | 返回 JSON：四维度评分 + 问题列表 + 改进建议 |
| 规划模式 | 日常/阶段性 | 根据掌握度推荐下一关，生成学习周报 |

**涉及文件：**
- 后端：`ai_service.py`（重写）
- 前端：`AIChat.tsx`（改造，增加模式切换和智能体常驻侧边栏）

---

### 4.2 Python 闯关 AI 自适应（6 个功能）

#### 功能 1：能力诊断

| 项目 | 内容 |
|------|------|
| 效果 | 注册后做 5-10 道选择题，智能体判断水平，推荐从哪关开始学 |
| 后端新增 | `UserDiagnostic` 表 + `diagnostic_service.py` + `diagnostic.py` 路由 |
| 前端新增 | `Diagnostic.tsx` 页面 |
| 判断逻辑 | 正确率 0-30% 从第 1 关开始；31-60% 跳简单关；61-80% 从中级开始；81%+ 推荐综合项目 |

#### 功能 2：知识点掌握度

| 项目 | 内容 |
|------|------|
| 效果 | 每个知识点有掌握度百分比，可视化展示 |
| 后端新增 | `UserKnowledge` 表 + `knowledge_service.py`，每次提交后更新 |
| 前端改造 | `Profile.tsx` 增加知识画像图表（条形图/热力图） |
| 数据改造 | `python.json` 每关增加 `knowledge_tags`、`estimated_minutes`、`prerequisites` 字段 |

#### 功能 3：结构化代码审查

| 项目 | 内容 |
|------|------|
| 效果 | 提交代码后，智能体从四个维度打分（正确性/可读性/效率/规范性），定位到具体代码行 |
| 后端新增 | `ai_service.py` 新增 `structured_review()` 方法，让 DeepSeek 返回 JSON |
| 前端新增 | `CodeReviewPanel.tsx`（雷达图 + 逐行标注） |

#### 功能 4：AI 错题本

| 项目 | 内容 |
|------|------|
| 效果 | 错误按类型分类（语法/逻辑/边界/性能），追踪是否解决，支持复习 |
| 后端新增 | `UserError` 表 + `error_service.py` + `errors.py` 路由 |
| 前端新增 | `ErrorBook.tsx` 页面 |

#### 功能 5：个性化推荐

| 项目 | 内容 |
|------|------|
| 效果 | 智能体根据薄弱知识点推荐下一关，不再是固定顺序 |
| 后端新增 | `recommend_service.py` + 推荐接口 |
| 前端改造 | 闯关地图和关卡页展示推荐标记 |

#### 功能 6：学习周报（P2，有余力做）

| 项目 | 内容 |
|------|------|
| 效果 | 每周自动生成学习报告（完成关卡数/薄弱知识点/下周推荐） |
| 后端新增 | 统计服务 + AI 总结 |
| 前端新增 | 周报页面 |

---

## 五、大改范围总结

| 文件 | 改动类型 | 说明 |
|------|:--------:|------|
| `ai_service.py` | **重写** | 抽象工厂 + 四种模式 + DeepSeek 优先 |
| `seed_service.py` | 修改 | 补全 14 种语言 |
| `judge_service.py` | 修改 | 去掉 Docker 沙箱逻辑 |
| `config.py` | 修改 | 增加 AI 优先级配置 |
| `.env` | 修改 | 增加 `ALLOW_DIRECT_EXECUTION`、`ADMIN_USERNAME`、`ADMIN_PASSWORD` |
| `python.json` | 修改 | 每关增加知识点标签 |
| `models/` | 新增 3 个文件 | `diagnostic.py`、`knowledge.py`、`error.py` |
| `services/` | 新增 4 个文件 | `diagnostic_service.py`、`knowledge_service.py`、`error_service.py`、`recommend_service.py` |
| `routers/` | 新增 3 个文件 | `diagnostic.py`、`errors.py`，推荐接口加到 `lessons.py` |
| 前端 `pages/` | 新增 2 个页面 | `Diagnostic.tsx`、`ErrorBook.tsx` |
| 前端 `pages/` | 改造 3 个页面 | `Lobby.tsx`、`CourseMap.tsx`、`Lesson.tsx`、`Profile.tsx` |
| 前端 `components/` | 新增 2 个组件 | `CodeReviewPanel.tsx`、`KnowledgeChart.tsx` |
| 前端 `components/` | 改造 1 个组件 | `AIChat.tsx` |
| 前端 `index.css` | 改造 | 配色方案改为 Hello World 清新蓝白风 |
| 管理后台 `LessonManager.tsx` | 改造 | 增加标签管理功能 |

---

## 六、四人分工（每人约 8-9 天）

| 成员 | 角色 | 负责内容 |
|:----:|------|----------|
| **A** | 基础设施 | P0 全部修复（语言补全、AI 抽象层、管理员密码、检查脚本、去掉 Docker、项目重命名）+ 数据库建表 + 能力诊断后端 + 会员系统 + 部署文档 + 联调 |
| **B** | AI 智能体 | AI 抽象层 + 四种模式 Prompt + 结构化代码审查（JSON 返回+解析）+ 错题分类 + 学习周报 |
| **C** | 前端 | UI 品牌重命名 + 诊断页面 + 雷达图组件 + 错题本页面 + 知识画像 + 智能体交互 UI |
| **D** | 内容+推荐 | 关卡检查脚本 + Python 24 关打标签 + 推荐算法 + 管理后台改造 + 周报统计 + 文档 + 测试 |