# D 模块测试报告

## 自动验证

- `python scripts/check_six_language_content.py`：验证 172 关固定基线、必填字段、标签类型、预估时长、同语言前置依赖、真实 slug 引用和无循环依赖。
- `python -m unittest tests.test_recommendation -v`：覆盖新用户顺序兜底、最低掌握度匹配、无匹配兜底。
- `python -m compileall app scripts -q`：后端语法编译检查。

## 联调项

- A 的六语言知识掌握度更新完成后，使用不同掌握度账号验证推荐排序。
- C 使用 `/lessons/recommend` 在 CourseMap 渲染推荐标记。
- 管理员编辑 metadata 后刷新页面，确认数据库保存和回显。
