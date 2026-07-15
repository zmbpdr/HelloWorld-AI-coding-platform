# 课程内容规范

六种启用语言的每个 lesson JSON 都必须包含 `knowledge_tags`、`estimated_minutes` 和 `prerequisites`。

- `knowledge_tags`：非空字符串数组，使用跨语言可复用的概念，例如“变量与数据类型”“循环”“函数”“字符串”“映射与对象”“面向对象”“异常处理”“算法”。
- `estimated_minutes`：正整数，表示正常完成本关的预估分钟数。
- `prerequisites`：slug 数组；首关为 `[]`，其他关依赖当前语言的上一关。禁止跨语言引用和循环依赖。

`build_lesson_metadata.py --write` 可按统一分类规则补齐当前课程数据；数据变更后必须运行 `check_six_language_content.py`。
