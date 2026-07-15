# 个性化推荐算法

接口：`GET /api/v1/lessons/recommend?language=<slug>`。

1. 读取当前用户的 `UserKnowledge`，不新建任何掌握度表。
2. 排除已完成、下架和不属于可选语言范围的关卡。
3. 找出最低 mastery 的知识标签，并匹配 lesson 的 `knowledge_tags`。
4. 按知识掌握度、语言排序和关卡顺序返回最多三项推荐，并附带 `reason` 与 `matched_tags`。
5. 新用户、没有匹配标签或候选关卡为空时，返回 `recommended: []`，并以 `next_normal` 给出顺序学习的下一关。

响应还包含 `knowledge_map`，供前端展示掌握度概览。
