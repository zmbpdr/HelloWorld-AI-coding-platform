## 一、一句话结论

两周计划明日（8/29）收官。截至 8/28：**后端线已超额完成**——Seed 改造、诊断题入库、文件导入（原 P1）、RAG 基础设施（原 P2 远期）四项后端全部交付并在本机联调通过；**前端接入线、AST 与 RAG 上下文注入、测试体系尚未启动**。当前产品能力边界 = 既有全部功能 + 三个新功能的后端 API（教师暂无法通过界面使用，仅可 API 调用）。

---

## 二、总体进度概览

### 2.1 两周分工方案任务完成度

| 成员 | 原计划任务 | 实际状态 | 完成度 |
|:----:|-----------|:--------|:------:|
| **A（后端）** | Seed 改造 → 诊断题入库后端 → 文件导入后端 → RAG 后端 | **全部完成**，且文件导入（原 P1）与 RAG（原 P2）提前实施 | 100% |
| **B（前端）** | 诊断题管理页面 → 文件导入前端 → 学生端渲染增强 → RAG 前端 | **均未启动**：无 DiagnosticManager.tsx、无导入按钮、无 highlight.js、无 RAG 状态页 | 0% |
| **C（全栈）** | AST 知识点验证 → RAG 上下文注入 → 内容隔离 | **均未启动**：无 ast_analyzer.py，`_build_messages` 无 rag_results，检索无租户过滤 | 0% |
| **D（测试）** | Embedding 验证 → 安全测试 → 测试用例 → 测试报告 | Embedding 验证已有结论（采用本地方案并落地）；测试用例与报告未产出 | ~20% |

### 2.2 版本管理状态（重要）

第二周的全部新代码**尚未提交 git**（最后一次提交停在"题库批量导入"）。

---

## 三、已交付明细（含代码证据）

### 3.1 Seed 数据源策略全面落地（原待完成项 3.3 → 已完成）

`app/services/seed_service.py` 中五类数据全部实现"仅首次初始化"：

| 数据 | 逻辑 | 代码位置 |
|------|------|---------|
| lessons（172 关） | 表非空则跳过 JSON 导入 | 第 148-151 行 |
| achievements | 按 slug 去重，只增不改 | 第 180-184 行 |
| diagnostic_questions | 表非空则跳过写入 10 道预设题 | 第 186-191 行 |
| admin 账号 | 已存在则不创建 | 第 193-202 行 |
| agent_nodes（92 节点） | 按 slug 去重，只增不改 | 第 205-234 行 |

languages 为每次更新（语言元数据属系统配置，非教师内容，策略合理）。

### 3.2 诊断题入库改造（原待完成项 3.1 → 后端已完成，前端未接）

**交付情况（对照分工方案交付物清单 6 项中 5 项已完成）：**

| 交付物 | 状态 | 说明 |
|--------|:----:|------|
| `app/models/diagnostic_question.py` | ✅ | 7 字段：question(Text)/options(JSON)/answer/tag/order/is_active + 时间戳 |
| `app/services/diagnostic_service.py` 改造 | ✅ | 硬编码 `DIAGNOSTIC_QUESTIONS` 列表已**彻底移除**，改为按 is_active 过滤、order 排序查询数据库 |
| `app/routers/diagnostic.py` 学生端 | ✅ | 数据源切换为 DB；返回题目时剥离 answer，防答案泄露 |
| `app/routers/admin/diagnostic.py` 管理端 | ✅ | 6 个端点（见下表） |
| Alembic 迁移脚本 | ✅ | `6cdd3e295e9e_add_diagnostic_questions_table.py` |
| `DiagnosticManager.tsx` 管理页面 | ❌ | 未创建，无对应 API 封装、路由与菜单入口 |

**管理端 API（已注册至 `/api/v1/admin`）：**

| 端点 | 方法 | 说明 |
|------|:----:|------|
| `/diagnostic-questions` | GET | 列表，支持分页 + 按标签筛选 |
| `/diagnostic-questions/{id}` | GET | 详情 |
| `/diagnostic-questions` | POST | 新增，`require_role("editor")` |
| `/diagnostic-questions/{id}` | PUT | 编辑 |
| `/diagnostic-questions/{id}` | DELETE | **软删除**（置 is_active=False） |
| `/diagnostic-questions/{id}/toggle` | POST | 启用/停用切换 |

**与方案的实现差异（不影响功能）：** toggle 用 POST（方案为 PUT）；删除为软删除（方案为硬删除，软删除更稳妥）。

### 3.3 文件导入解析（原 P1 按需项 3.4 → 后端已完成，前端未接）

**原定"按需启动"的 P1 已提前完成后端**，交付物：

- `app/routers/admin/file_import.py`：`POST /api/v1/admin/lessons/parse-word`、`POST /api/v1/admin/lessons/parse-pdf`，均校验 editor 权限、文件格式与 20MB 大小上限
- `app/services/file_import_service.py`：
  - **Word 解析**（python-docx 1.1.2）：段落 → Markdown 段落；Heading 1-4 → `#`~`####`；列表样式 → `-`；加粗/斜体/粗斜体 → `**`/`*`/`***`；表格 → Markdown 表格（首行为表头）；**内嵌图片经 relationship 提取并保存至 uploads 目录**，替换为可访问 URL
  - **PDF 解析**（PyMuPDF 1.24.11）：按页提取文本与图片，图片同样落盘并替换 URL
- `requirements.txt` 已补齐 python-docx、PyMuPDF 依赖

**未完成：** 前端"导入文件"按钮与 Upload 集成（原 B 第一周 Day 3-4 任务），教师目前只能通过 API 使用。

### 3.4 RAG 检索基础设施（原 P2 远期项 3.5 → 基础层已完成）

**原定远期的教师内容 RAG，其索引与检索基础设施已提前交付**：

- `app/services/rag_service.py`：
  - **向量存储**：ChromaDB 1.5.9 持久化客户端（`./chroma_data`），lessons collection，元数据含 lesson_id/标题/语言/知识点标签
  - **Embedding**：sentence-transformers（all-MiniLM-L6-v2）**本地模型**——零外部 API 依赖、零调用成本、数据不出校
  - **分块策略**：按 `##` 标题切分，单块 ≤ 2000 字符，重叠 100 字符，超长块按段落二次拆分
  - **检索**：语义相似度 top_k 检索（默认 5）+ 知识点标签匹配加权（+15%），支持按标签过滤
- `app/routers/admin/rag.py`（5 个管理端 API）：

| 端点 | 方法 | 说明 |
|------|:----:|------|
| `/rag/status` | GET | 索引状态（已索引块数、模型、存储路径） |
| `/rag/index-all` | POST | 全量索引（BackgroundTasks 后台执行，避免超时） |
| `/rag/index-lesson/{id}` | POST | 单篇索引 |
| `/rag/index-lesson/{id}` | DELETE | 删除单篇索引 |
| `/rag/search` | GET | 检索测试（q/top_k/tag 参数） |

**与原方案的关键差异：** 方案原定"验证 DeepSeek Embedding 可用性"。实际验证结论为**不可用/不采用**，直接落地了方案中 D 成员提出的备选路线（sentence-transformers 本地模型），印证了此前"聊天 API 可用不代表 Embedding 接口可用"的经验教训。

**未完成部分（对应 C 第二周任务，RAG 尚未进入 AI 对话链路）：**

| 未完成项 | 现状 | 影响 |
|---------|------|------|
| AI 上下文注入 | `ai_service.py` 的 `_build_messages` 无 rag_results 参数，`ai.py` 对话前无检索调用 | 学生提问时 AI 不会引用教程内容 |
| 内容隔离 | 检索仅按 is_active 和知识标签过滤，**无 created_by/school_id 租户隔离** | 多教师/多校销售场景必须补 |
| RAG 前端 | 无状态页、无学生端引用展示 | 教师无法可视化运维索引 |

### 3.5 Embedding 验证（D 第一周任务 → 已有结论并落地）

结论已体现在代码中：采用本地 sentence-transformers（见 3.4），后续无需再验证。

---

## 四、未完成项清单（按对产品价值的影响排序）

| # | 未完成项 | 归属 | 工作量（方案口径） | 阻塞的价值 |
|:-:|---------|:----:|:------:|-----------|
| 1 | 诊断题管理页面（DiagnosticManager.tsx + API 封装 + 菜单路由） | B | 1.5 天 | **商业化闭环**——后端已就绪，缺此页则"买家改题仍需改源码"的问题未真正解决 |
| 2 | 学生端代码语法高亮 + GFM 扩展（highlight.js 集成） | B | 0.5 天 | 编程学习平台的基本体验要求，学生端可见 |
| 3 | 文件导入前端（导入按钮 + Upload + API 对接） | B | 1.5 天 | 后端已就绪，教师现成 Word 教案迁移能力 |
| 4 | RAG 上下文注入（_build_messages 扩展 + ai.py 检索） | C | 3 天 | RAG 从"基础设施"变为"学生可感知功能"的关键一跳 |
| 5 | RAG 内容隔离（created_by 过滤） | C | 2.5 天 | 多教师场景安全底线（单校演示可暂缓） |
| 6 | RAG 前端（状态页 + 引用展示） | B | 2 天 | 索引运维可视化 |
| 7 | AST 知识点自动验证（ast_analyzer.py + API + 按钮） | C | 5 天 | 锦上添花，**建议明确移出本期** |
| 8 | 测试体系（test_file_import / test_diagnostic_migration / 集成测试 / 测试报告） | D | — | 质量保障；现有 tests/ 仅 2 个旧文件（recommendation、upload_image） |

---

## 五、预期功能全景对照（逐项更新）

| 功能 | 预期说明状态 | 当前实际状态 | 变化 |
|------|:----:|:----|------|
| 闯关学习（172关/6语言） | 已完成 | 已完成 | 无变化 |
| 能力诊断（10题） | 已完成（硬编码） | 已完成，且**题目已入库可运营**（后端） | ⬆ 升级 |
| AI 智能体（4种模式） | 已完成 | 已完成 | 无变化 |
| 代码评测引擎（6语言） | 已完成 | 已完成 | 无变化 |
| 知识掌握度与推荐 | 已完成 | 已完成 | 无变化 |
| 错题本与双轨降级 | 已完成 | 已完成 | 无变化 |
| 智能体工坊（92节点） | 已完成 | 已完成 | 无变化 |
| Markdown 教程编辑器 | 已完成 | 已完成 | 无变化 |
| 图片上传安全机制 | 已完成 | 已完成 | 无变化 |
| 题库管理系统 | 已完成 | 已完成 | 无变化 |
| 教程-题目关联 | 已完成 | 已完成 | 无变化 |
| 批量导入预检查 | 已完成 | 已完成 | 无变化 |
| 数据源策略 | 部分完成（lessons 未做） | **全部完成**（五类数据首次初始化） | ⬆ 收口 |
| 诊断题入库改造 | 未完成 | **后端完成**（模型/服务/6个API/迁移/seed），管理页面未做 | ⬆ 后端交付 |
| 学生端代码语法高亮 | 未完成 | 未完成 | — |
| Seed 首次初始化改造 | 未完成 | **已完成** | ⬆ 交付 |
| PDF/Word 文件导入 | P1 未完成 | **后端完成**（2个API + 解析服务 + 依赖），前端按钮未做 | ⬆ 提前交付后端 |
| 教师内容 RAG | P2 远期未完成 | **基础设施完成**（ChromaDB + 本地 Embedding + 5个API），AI 注入/隔离/前端未做 | ⬆ 提前启动 |
| AST 知识点验证 | 未完成 | 未完成 | — |
| 竞赛题库 RAG | 不做 | 未做（维持决策） | — |

---

## 六、关键风险与建议

### 6.1 风险

1. **前后端脱节（最高风险）**：三个新功能后端均已可用，但教师界面完全未接入。若 8/29 收官时前端仍未跟上，对外可演示的实际增量只有"重启不丢数据"一条，两周投入的功能价值无法在界面上呈现。
2. **代码未提交**：第二周全部产出停留在工作区，存在丢失风险，也导致 git 历史无法反映真实进度。
3. **RAG 半成品状态**：索引/检索已就绪但未接入 AI 对话，若就此收尾，RAG 在产品中无用户可感知的功能入口。

### 6.2 8/29 收官日建议（按性价比排序）

1. **立即提交现有后端代码**（按功能分 4 个 commit）
2. **诊断题管理页面**（1.5 天任务压缩执行或至少完成列表 + 新增/编辑/启停核心交互）——打通"教师改题"闭环，这是商业化叙事的最后一公里
3. **学生端语法高亮**（0.5 天）——学生端可见的体验升级，演示效果直接
4. 若时间允许：文件导入前端（1.5 天）
5. **明确降级**：AST 移出本期；RAG 注入/隔离/前端列入下期；测试至少补 `test_diagnostic_migration`（首次 seed → 重启不覆盖 → 修改保留）与文件导入冒烟用例
6. `chroma_test/` 调试目录确认用途后决定是否入库或加入 .gitignore

### 6.3 已知技术问题（建议复核）

| # | 问题 | 位置 | 说明 |
|:-:|------|------|------|
| 1 | `doc.close()` 之后调用 `len(doc)` | `file_import_service.py` 第 166-168 行 | `parse_pdf_to_markdown` 在关闭文档后才计算 pages，PyMuPDF 关闭后访问文档可能异常，建议将 `len(doc)` 提前到 close 之前 |
| 2 | RAG 无租户隔离 | `rag_service.py` 索引与检索 | 当前单校/演示场景可接受；多教师商业化场景上线前**必须**补 created_by/school_id 过滤 |
| 3 | index-all 无进度回报 | `admin/rag.py` | 后台任务只返回"已开始"，无进度查询接口，后续做 RAG 状态页时需补充 |

---

## 七、v9.0 版本基线说明

- **v9.0 = 既有全部功能 + Seed 数据源策略收口 + 三个新功能的后端层**
- 数据库 20 → **21 张表**（新增 diagnostic_questions）
- API 端点 40+ → **50+**（新增诊断题管理 6 个、文件解析 2 个、RAG 管理 5 个）
- 新增后端依赖：python-docx、PyMuPDF、chromadb、sentence-transformers
- 对教师的可用性边界：诊断题维护、文件导入、RAG 索引**暂只能通过 API 使用**，管理界面接入前不构成面向教师的完整功能
- 详细产品说明见同目录《Hello_World_产品说明文档_v9.0.md》
