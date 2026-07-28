# API 接口契约

> 版本：v3.0 | 共 40+ 个端点，分 10 大类别
> Base URL：`http://localhost:8006/api/v1`
> 认证方式：JWT Bearer Token（Header: `Authorization: Bearer <token>`）
> 响应格式：成功返回 JSON 数据，失败返回 `{"detail": "错误描述"}`
> Content-Type：`application/json`

---

## 端点总览

### 认证（3）

| 方法 | 路径 | 用途 |
|:----:|------|------|
| POST | `/api/v1/auth/register` | 用户注册 |
| POST | `/api/v1/auth/login` | 用户登录 |
| POST | `/api/v1/auth/refresh` | 刷新令牌 |

### 课程与关卡（8）

| 方法 | 路径 | 用途 |
|:----:|------|------|
| GET | `/api/v1/languages` | 语言列表（含用户进度） |
| GET | `/api/v1/languages/{slug}` | 语言详情 |
| GET | `/api/v1/languages/{slug}/map` | 闯关地图（含解锁状态） |
| GET | `/api/v1/lessons/{id}` | 课时详情 |
| POST | `/api/v1/lessons/{id}/submit` | 提交代码评测 |
| GET | `/api/v1/lessons/{id}/stats` | 评测统计 |
| GET | `/api/v1/lessons/{id}/hint` | 获取提示 |
| GET | `/api/v1/lessons/recommend` | 推荐关卡 |

### AI 智能体（8）

| 方法 | 路径 | 用途 |
|:----:|------|------|
| POST | `/api/v1/ai/chat` | AI 通用对话（非流式） |
| WS | `/api/v1/ai/chat/ws?token={jwt}` | AI 流式对话（WebSocket） |
| POST | `/api/v1/ai/diagnostic` | 代码诊断 |
| POST | `/api/v1/ai/tutor` | 导师指导 |
| POST | `/api/v1/ai/review` | 结构化代码审查（四维度评分） |
| POST | `/api/v1/ai/plan` | 学习规划 |
| POST | `/api/v1/ai/classify-error` | AI 错误分类 |
| POST | `/api/v1/ai/history` | 保存对话历史 |
| GET | `/api/v1/ai/history` | 获取对话历史 |
| DELETE | `/api/v1/ai/history` | 清空对话历史 |
| GET | `/api/v1/ai/weekly-report` | AI 学习周报生成 |

### 能力诊断（3）

| 方法 | 路径 | 用途 |
|:----:|------|------|
| GET | `/api/v1/diagnostic/questions` | 获取 10 道诊断题目（不含答案） |
| POST | `/api/v1/diagnostic/submit` | 提交诊断答案 |
| GET | `/api/v1/diagnostic/result` | 查询诊断结果 |

### 错题本与知识掌握度（4）

| 方法 | 路径 | 用途 |
|:----:|------|------|
| GET | `/api/v1/errors` | 获取错题列表（支持类型/状态筛选） |
| PATCH | `/api/v1/errors/{id}/resolve` | 标记错题已解决 |
| GET | `/api/v1/progress/knowledge` | 获取知识掌握度 |
| GET | `/api/v1/users/me/activity` | 近 90 天活动热力图 |

### 用户与进度（4）

| 方法 | 路径 | 用途 |
|:----:|------|------|
| GET | `/api/v1/users/me` | 当前用户信息 |
| GET | `/api/v1/users/me/progress` | 所有学习进度 |
| GET | `/api/v1/users/me/stats` | 用户统计数据 |
| GET | `/api/v1/users/me/achievements` | 已解锁成就 |

### 排行榜（1）

| 方法 | 路径 | 用途 |
|:----:|------|------|
| GET | `/api/v1/leaderboard?period=` | 排行榜（week/month/all） |

### 代码收藏（3）

| 方法 | 路径 | 用途 |
|:----:|------|------|
| GET | `/api/v1/snippets` | 收藏列表（支持搜索/标签筛选） |
| POST | `/api/v1/snippets` | 收藏代码 |
| DELETE | `/api/v1/snippets/{id}` | 删除收藏 |

### 智能体工坊（5）

| 方法 | 路径 | 用途 |
|:----:|------|------|
| GET | `/api/v1/agent/map` | 神经元网络地图（节点+连线+进度） |
| GET | `/api/v1/agent/nodes/{id}` | 节点详情 |
| POST | `/api/v1/agent/nodes/{id}/submit` | 提交代码评测 |
| GET | `/api/v1/agent/progress` | 用户所有节点进度 |
| GET | `/api/v1/agent/tracks` | 8 条主线概览 |

### 会员（2）

| 方法 | 路径 | 用途 |
|:----:|------|------|
| GET | `/api/v1/users/me/membership` | 查询会员信息 |
| POST | `/api/v1/users/me/upgrade` | 模拟升级 Pro |

---

## 接口详细契约

### 1. 能力诊断

#### 1.1 GET /diagnostic/questions

**请求：** 无请求体，需 JWT Token。

**响应：**
```json
{
  "questions": [
    {
      "id": 1,
      "question": "Python 中 print(type(42)) 的输出是什么？",
      "options": ["A. <class 'int'>", "B. <class 'str'>", "C. 42", "D. int"],
      "tag": "数据类型"
    }
  ]
}
```

**注：** 响应不含 `answer` 字段，仅后端知晓正确答案。

#### 1.2 POST /diagnostic/submit

**请求体：**
```json
{
  "answers": [
    {"question_id": 1, "answer": "A"},
    {"question_id": 2, "answer": "C"}
  ]
}
```

**响应体：**
```json
{
  "score": 75,
  "skill_level": "intermediate",
  "correct_tags": ["变量", "数据类型"],
  "weak_tags": ["循环", "函数"],
  "recommended_start": "python-08-loops",
  "message": "基础掌握得不错！建议直接进入循环和函数的学习。"
}
```

**skill_level 取值：** `beginner` / `intermediate` / `advanced`

**评分规则：** 逐条比对答案字母，正确数 ÷ 总题数 × 100 = 得分。0-30 分 beginner，31-60 beginner（可跳过基础），61-80 intermediate，81-100 advanced。

---

### 2. AI 智能体

#### 2.1 POST /ai/chat（非流式）

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

**mode 取值：** `tutor` / `diagnostic` / `review` / `plan`

**响应体：**
```json
{
  "reply": "循环是编程中非常重要的概念..."
}
```

#### 2.2 WS /ai/chat/ws?token={jwt}（流式）

**连接方式：** WebSocket，URL 参数传 JWT 鉴权。

**消息格式：** 客户端发送 JSON 字符串，格式同 2.1 请求体。服务端逐字推送：

```json
{"chunk": "循", "done": false}
{"chunk": "环", "done": false}
{"chunk": "", "done": true}
```

#### 2.3 POST /ai/review（结构化审查）

**请求体：**
```json
{
  "code": "def hello():\n    return 'hello'",
  "lesson_title": "Hello World"
}
```

**正常响应：**
```json
{
  "correctness": 85,
  "readability": 70,
  "efficiency": 65,
  "compliance": 80,
  "problems": [
    {"line": 1, "severity": "warning", "message": "函数名较通用，建议更具体"},
    {"line": 2, "severity": "error", "message": "返回值不正确"}
  ],
  "summary": "整体逻辑正确，但返回值与题目要求不一致。",
  "next_action": "检查题目要求，确保输出格式正确。"
}
```

#### 2.4 POST /ai/classify-error（错误分类）

**请求体：**
```json
{
  "code": "print(name",
  "stderr": "SyntaxError: unexpected EOF while parsing",
  "score": 0,
  "test_results": []
}
```

**响应体：**
```json
{
  "error_type": "syntax",
  "analysis": "代码缺少右括号，print(name) 应为 print(name)"
}
```

**error_type 取值：** `syntax` / `logic` / `boundary` / `performance` / `other`

**双轨降级：** AI 调用失败时自动降级到规则关键词匹配（SyntaxError→语法，IndexError→边界等）。

---

### 3. 代码评测

#### 3.1 POST /lessons/{id}/submit

**请求体：**
```json
{
  "code": "print('Hello World')",
  "language": "python"
}
```

**响应体：**
```json
{
  "status": "accepted",
  "score": 100,
  "stdout": "Hello World\n",
  "stderr": "",
  "execution_time": 45,
  "test_results": [
    {"status": "passed", "expected": "Hello World", "actual": "Hello World"}
  ],
  "xp_earned": 10,
  "star_rating": 5,
  "error_type": "",
  "ai_analysis": ""
}
```

**status 取值：** `accepted` / `wrong` / `error` / `timeout`

**星评规则：** 0-5 星，满分 + 快速执行 = 5 星。

---

### 4. 错题本

#### 4.1 GET /errors

**请求参数（URL Query，可选）：**
- `type`：按类型筛选（syntax / logic / boundary / performance）
- `resolved`：按解决状态筛选（true/false）

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
  "stats": {"syntax": 5, "logic": 3, "boundary": 1, "performance": 0}
}
```

#### 4.2 PATCH /errors/{error_id}/resolve

**请求体：** 可选，含 `fixed_code` 时保存修正代码。

**响应体：** `{"id": 1, "is_resolved": true}`

---

### 5. 知识掌握度与推荐

#### 5.1 GET /progress/knowledge

**响应体：**
```json
{
  "knowledge": [
    {"tag": "变量", "mastery": 90.0, "total_attempts": 5, "correct_count": 4, "last_practice_at": "2024-01-15T10:00:00+00:00"},
    {"tag": "循环", "mastery": 35.0, "total_attempts": 8, "correct_count": 2, "last_practice_at": "2024-01-14T16:00:00+00:00"}
  ]
}
```

**掌握度算法：** 新掌握度 = 当前得分 × 0.6 + 历史掌握度 × 0.4

#### 5.2 GET /lessons/recommend?language=python

**响应体：**
```json
{
  "recommended": [
    {
      "lesson_id": 5, "slug": "python-05-loops",
      "title": "循环", "reason": "覆盖薄弱知识点: 循环",
      "matched_tags": ["循环"]
    }
  ],
  "next_normal": {"lesson_id": 6, "title": "列表"},
  "knowledge_map": {"变量": 90.0, "循环": 35.0, "函数": 60.0}
}
```

**推荐算法：** 找出掌握度最低的知识标签 → 筛选覆盖该标签的未完成关卡 → 按掌握度升序推荐最多 3 条。新用户或无匹配时返回下一节顺序关卡兜底。

---

### 6. 会员系统

#### 6.1 GET /api/v1/users/me/membership

**响应体：**
```json
{
  "membership": "free",
  "ai_calls_used": 3,
  "ai_calls_limit": 5,
  "is_unlimited": false
}
```

`membership` 取值：`free` / `pro`

#### 6.2 POST /api/v1/users/me/upgrade

**请求体：** `{"plan": "pro"}`

**响应体：** `{"membership": "pro", "message": "已升级为 Pro 会员"}`

**说明：** 该系统为 Mock 演示，无真实支付。仅修改 users 表 membership 字段。

---

### 7. 代码评测执行配置

| 语言 | 扩展名 | 执行命令 | 编译命令 |
|------|--------|----------|---------|
| Python | .py | `python {file}` | 无 |
| JavaScript | .js | `node {file}` | 无 |
| Java | .java | `java -cp {dir} {classname}` | `javac -encoding UTF-8 {file}` |
| C | .c | `{output}` | `gcc -std=c11 -o {output} {file}` |
| C++ | .cpp | `{output}` | `g++ -std=c++17 -o {output} {file}` |
| TypeScript | .ts | `node {js_output}` | `tsc --target ES2020 --module commonjs --outDir {dir} {file}` |

**智能比对（_smart_match）：** 精确匹配 → 数值近似（误差 <0.0001） → 子串匹配 → 空白归一化 → numpy 前缀清洗
