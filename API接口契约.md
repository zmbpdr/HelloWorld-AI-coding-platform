# API 接口契约

> 版本：v1.0（第 1 天定稿，后续修改需通知所有人）
> Base URL：`http://localhost:8000/api/v1`
> 认证方式：JWT Bearer Token（Header: `Authorization: Bearer <token>`）
> 响应格式：成功返回 JSON 数据，失败返回 `{"detail": "错误描述"}`
> Content-Type：`application/json`

---

## 接口总览

| 方法 | 路径 | 用途 | 负责人 |
|------|------|------|:------:|
| GET | `/diagnostic/questions` | 获取诊断题目 | **A** |
| POST | `/diagnostic/submit` | 提交诊断答案 | **A** |
| POST | `/ai/chat` | AI 对话 | **B** |
| POST | `/ai/chat/stream` | AI 流式对话（SSE） | **B** |
| POST | `/ai/review` | 结构化代码审查 | **B** |
| POST | `/ai/classify-error` | 错误分类 | **B** |
| GET | `/errors` | 获取错题列表 | **A** |
| PATCH | `/errors/{id}/resolve` | 标记错题已解决 | **A** |
| GET | `/progress/knowledge` | 获取知识掌握度 | **A** |
| GET | `/lessons/recommend` | 获取推荐关卡 | **D** |

---

## 1. 能力诊断

### 1.1 GET /diagnostic/questions

**请求：** 无请求体，需 JWT Token。

**响应：**
```json
{
  "questions": [
    {
      "id": 1,
      "question": "Python 中 print(type(42)) 的输出是什么？",
      "options": ["A. <class 'int'>", "B. <class 'str'>", "C. 42", "D. int"],
      "answer": "A",
      "tag": "数据类型"
    }
  ]
}
```

**字段说明：** `answer` 为正确答案，后端判断用，前端不可展示。

### 1.2 POST /diagnostic/submit

**请求体：**
```json
{
  "answers": [
    {"question_id": 1, "answer": "A"},
    {"question_id": 2, "answer": "C"}
  ]
}
```

**响应体（成功）：**
```json
{
  "score": 75,
  "skill_level": "intermediate",
  "correct_tags": ["变量", "print", "数据类型"],
  "weak_tags": ["循环", "函数"],
  "recommended_start": "python-05-loops",
  "message": "你已经掌握了变量和输出，但循环还需要加强。建议从第5关开始。"
}
```

**skill_level 取值：** `beginner` / `intermediate` / `advanced`

---

## 2. AI 智能体

### 2.1 POST /ai/chat（非流式）

**请求体：**
```json
{
  "message": "我不太理解循环的概念",
  "mode": "tutor",
  "context": {
    "lesson_title": "for 循环",
    "code": "for i in range(10):\n    print(i)"
  }
}
```

**mode 取值：** `tutor`（导师）/ `diagnostic`（诊断）/ `review`（审查）/ `planning`（规划）

**context 字段：** 均为可选。
- `lesson_title`: 当前关卡标题
- `code`: 用户代码
- `error`: 错误信息
- `knowledge`: 知识掌握度（JSON）

**响应体：**
```json
{
  "reply": "循环是编程中非常重要的概念..."
}
```

**错误处理：** AI 不可用时返回 HTTP 500，`detail` 为"AI服务暂时不可用，请稍后重试"。

### 2.2 POST /ai/chat/stream（流式）

**请求体：** 同上（同 2.1）。

**响应格式：** SSE（Server-Sent Events），每行格式：
```
data: {"chunk": "循", "done": false}
data: {"chunk": "环", "done": false}
data: {"chunk": "", "done": true}
```

**前端消费方式：** `EventSource` 或 `fetch` + `ReadableStream`。

### 2.3 POST /ai/review（结构化审查）

**请求体：**
```json
{
  "code": "def hello():\n    return 'hello'",
  "lesson_title": "Hello World",
  "test_results": [
    {"status": "passed", "expected": "hello", "actual": "hello"},
    {"status": "failed", "expected": "Hello, World!", "actual": "hello"}
  ]
}
```

**正常响应体（JSON 解析成功）：**
```json
{
  "correctness": 85,
  "readability": 70,
  "efficiency": 65,
  "compliance": 80,
  "problems": [
    {"line": 1, "severity": "warning", "message": "函数名 hello 比较通用，建议更具体"},
    {"line": 2, "severity": "error", "message": "返回值不正确"}
  ],
  "summary": "整体代码逻辑正确，但返回值与题目要求不一致。",
  "next_action": "建议检查题目要求，确保输出格式正确。"
}
```

**降级响应体（JSON 解析失败时）：**
```json
{
  "correctness": 0,
  "readability": 0,
  "efficiency": 0,
  "compliance": 0,
  "problems": [],
  "summary": "（AI 返回的纯文本内容）",
  "next_action": "",
  "fallback": true
}
```

**前端处理规则：** 判断 `fallback` 为 `true` 时，隐藏雷达图，只展示 `summary` 文本。

### 2.4 POST /ai/classify-error（错误分类）

**请求体：**
```json
{
  "code": "print(name",
  "stderr": "SyntaxError: unexpected EOF while parsing",
  "test_results": []
}
```

**响应体：**
```json
{
  "error_type": "syntax",
  "analysis": "代码缺少右括号，print(name) 应该是 print(name)"
}
```

**error_type 取值：** `syntax`（语法错误）/ `logic`（逻辑错误）/ `boundary`（边界错误）/ `performance`（性能问题）

---

## 3. 错题本

### 3.1 GET /errors

**请求参数（均在 URL Query 中，可选）：**
- `type`：按类型筛选，取值：`syntax` / `logic` / `boundary` / `performance`
- `resolved`：按解决状态筛选，取值：`true` / `false`

**示例：** `GET /api/v1/errors?type=syntax&resolved=false`

**响应体：**
```json
{
  "errors": [
    {
      "id": 1,
      "lesson_id": 3,
      "error_type": "syntax",
      "error_code": "print(name",
      "ai_analysis": "缺少右括号",
      "is_resolved": false,
      "created_at": "2024-01-15T14:30:00+00:00"
    }
  ],
  "stats": {
    "syntax": 5,
    "logic": 3,
    "boundary": 1,
    "performance": 0
  }
}
```

**注意：** `error_code` 只返回前 200 个字符（前端展示摘要）。

### 3.2 PATCH /errors/{error_id}/resolve

**请求体：** 无。

**响应体：**
```json
{
  "id": 1,
  "is_resolved": true
}
```

**错误处理：** 错题不存在时返回 HTTP 404。

---

## 4. 知识掌握度

### 4.1 GET /progress/knowledge

**请求：** 无参数，需 JWT Token。

**响应体：**
```json
{
  "knowledge": [
    {
      "tag": "变量",
      "mastery": 90.0,
      "total_attempts": 5,
      "correct_count": 4,
      "last_practice_at": "2024-01-15T10:00:00+00:00"
    },
    {
      "tag": "循环",
      "mastery": 35.0,
      "total_attempts": 8,
      "correct_count": 2,
      "last_practice_at": "2024-01-14T16:00:00+00:00"
    }
  ]
}
```

---

## 5. 个性化推荐

### 5.1 GET /lessons/recommend

**请求参数（URL Query）：**
- `language`：（可选）语言 slug；传入后仅返回该语言地图可使用的推荐，未传入时按六语言全局顺序兜底。

**示例：** `GET /api/v1/lessons/recommend?language=python`

**响应体：**
```json
{
  "recommended": [
    {
      "lesson_id": 5,
      "slug": "python-05-loops",
      "title": "循环",
      "reason": "覆盖薄弱知识点: 循环",
      "matched_tags": ["循环"]
    }
  ],
  "next_normal": {"lesson_id": 6, "title": "列表"},
  "knowledge_map": {
    "变量": 90.0,
    "循环": 35.0,
    "函数": 60.0
  }
}
```

---

## 6. 关卡详情（有字段扩展）

### 6.1 GET /lessons/{slug}
（参考代码已有，以下为新增字段）

```json
{
  "id": 1,
  "slug": "python-01-hello-world",
  "title": "Hello World",
  "knowledge_tags": ["print", "字符串"],
  "estimated_minutes": 10,
  "prerequisites": []
}
```

知识标签、时长及前置关系的规范见 `docs/course-content-spec.md`。

---

## 7. 各角色 API 依赖速查

### C（前端）需要调用的 API
| 页面/组件 | 调用的 API | 开发方式 |
|-----------|-----------|:--------:|
| 诊断页面 Diagnostic.tsx | GET `/diagnostic/questions`, POST `/diagnostic/submit` | 先用 Mock 数据 |
| AI 聊天 AIChat.tsx | POST `/ai/chat`, POST `/ai/chat/stream` | Mock AI 模式 |
| 审查面板 CodeReviewPanel.tsx | POST `/ai/review` | 先用 Mock JSON |
| 错题本 ErrorBook.tsx | GET `/errors`, PATCH `/errors/{id}/resolve` | 先用 Mock 数据 |
| 知识图表 KnowledgeChart.tsx | GET `/progress/knowledge` | 先用 Mock 数据 |
| 首页/闯关地图（推荐标记） | GET `/lessons/recommend` | 先用固定数据 |

### A（后端）需要实现的 API
| API | 依赖 | 备注 |
|-----|:----:|------|
| GET `/diagnostic/questions` | 无 | 内存数据，不依赖数据库 |
| POST `/diagnostic/submit` | `user_diagnostics` 表 | |
| GET `/errors` | `user_errors` 表、B 的 `classify_error()` | B 未完成时可先用规则判断 |
| PATCH `/errors/{id}/resolve` | `user_errors` 表 | |
| GET `/progress/knowledge` | `user_knowledge` 表 | |

### B（AI）需要实现的 API
| API | 依赖 | 备注 |
|-----|:----:|------|
| POST `/ai/chat` | `config.py` 中的 DEEPSEEK_API_KEY | 无 Key 时用 Mock 模式 |
| POST `/ai/chat/stream` | 同上 | |
| POST `/ai/review` | 同上 | |
| POST `/ai/classify-error` | 同上 | |

### D（推荐）需要实现的 API
| API | 依赖 | 备注 |
|-----|:----:|------|
| GET `/lessons/recommend` | `user_knowledge` 表（A 建）| 第 3 天 A 建好表后才开始 |

---

## 8. 前端 Mock 数据参考

> C 开发时直接复制以下数据到 `mock/` 目录下使用，不需要等待后端。

```typescript
// mock/diagnostic.ts
export const mockDiagnosticResult = {
  score: 75,
  skill_level: "intermediate",
  correct_tags: ["变量", "print", "数据类型"],
  weak_tags: ["循环", "函数"],
  recommended_start: "python-05-loops",
  message: "你已经掌握了变量和输出，但循环还需要加强。建议从第5关开始。",
};

// mock/review.ts
export const mockReviewResult = {
  correctness: 85,
  readability: 70,
  efficiency: 65,
  compliance: 80,
  problems: [
    { line: 5, severity: "warning", message: "变量名 a 不够描述性" },
    { line: 12, severity: "error", message: "循环边界可能错误" },
  ],
  summary: "整体代码逻辑正确，但可读性和效率有提升空间。",
  next_action: "建议重新练习列表遍历",
};

// mock/knowledge.ts
export const mockKnowledge = [
  { tag: "变量", mastery: 90, total_attempts: 5, correct_count: 4 },
  { tag: "循环", mastery: 35, total_attempts: 8, correct_count: 2 },
  { tag: "函数", mastery: 60, total_attempts: 3, correct_count: 1 },
  { tag: "列表", mastery: 80, total_attempts: 4, correct_count: 3 },
  { tag: "条件判断", mastery: 95, total_attempts: 6, correct_count: 5 },
];

// mock/errors.ts
export const mockErrors = {
  errors: [
    { id: 1, lesson_id: 3, error_type: "syntax", error_code: "print(name", ai_analysis: "缺少右括号", is_resolved: false, created_at: "2024-01-15T14:30:00+00:00" },
    { id: 2, lesson_id: 5, error_type: "logic", error_code: "for i in range(1,10)", ai_analysis: "range(1,10) 不包含 10", is_resolved: false, created_at: "2024-01-15T15:00:00+00:00" },
  ],
  stats: { syntax: 5, logic: 3, boundary: 1, performance: 0 },
};
```
