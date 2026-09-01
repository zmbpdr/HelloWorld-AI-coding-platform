# Hello World v10.0 测试报告

测试范围：教师创作工具新增的诊断题入库、Word/PDF 教程导入、Markdown 渲染构建，以及既有推荐和 RAG 上下文注入回归。

## 自动化结果

在独立 Python 测试环境中执行：

```powershell
python -m pytest tests/test_diagnostic_migration.py tests/test_file_import.py tests/test_recommendation.py tests/test_rag_ai_context.py -q
```

结果：**11 passed**。

| 模块 | 覆盖内容 | 结果 |
| --- | --- | --- |
| 诊断题迁移 | 首次种子初始化 10 题、学生接口不泄露答案、停用题不返回、教师修改后二次种子不覆盖、评分读取更新后的答案 | 通过 |
| 文件导入 | Word 标题/粗斜体/表格转 Markdown；PDF 文本与多页页数返回 | 通过 |
| 推荐 | 新用户顺序兜底、薄弱标签匹配、无匹配兜底 | 通过 |
| RAG 上下文 | 检索结果注入 AI system message 的数量与截断规则 | 通过 |

## 本轮修复

发现 `parse_pdf_to_markdown()` 在关闭 PyMuPDF 文档后读取 `len(doc)`，任意有效 PDF 都会抛出 `ValueError: document closed`。现已改为关闭前保存页数，并由多页 PDF 回归用例覆盖。

## 前端构建

| 项目 | 命令 | 结果 |
| --- | --- | --- |
| 学习端 | `npm run build` | 通过 |
| 管理端 | `npm run build` | 通过 |

两端均保留 Vite 的 chunk 体积与 ineffective dynamic import 警告；不影响构建，但应作为后续性能优化项。管理端主 bundle 约 3.84 MB（gzip 约 1.21 MB），优先考虑页面级代码分割。

## 已知验证限制

- 图片上传安全测试依赖完整后端依赖环境；本轮独立环境的完整 `requirements.txt` 安装受 Windows 文件占用中断，未将该组结果计入通过数。既有 `test_upload_image.py` 仍在仓库中，应在干净环境执行。
- Word/PDF 解析的复杂排版、嵌入对象和扫描型 PDF 不承诺完全还原；本轮覆盖的是文本、内联格式、表格与多页 PDF 的核心链路。
- RAG 的实际语义效果、教师内容隔离和真实 AI 引用仍需在配置模型与索引的集成环境进行端到端验证。

## 建议的下一步

1. 在 CI 或干净虚拟环境按 `requirements-dev.txt` 安装并运行完整测试集。
2. 由 B/C 完成的前端入口联调后，执行教师改诊断题、导入文件、保存课程、学生端查看的端到端验收。
3. RAG 管理页完成后，增加不同教师内容隔离与索引增删的端到端测试。
