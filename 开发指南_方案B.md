# 闯关式 AI 编程学习平台 — 开发指南（方案B）

> 技术方案：FastAPI + HTMX + Alpine.js
> 决策日期：2026-07-13
> 团队：4人 / 3周交付
> 项目名称：待定（由团队讨论决定）

---

## 目录

1. [项目总览](#项目总览)
2. [环境搭建指南](#环境搭建指南)
3. [A角色：用户系统](#a角色用户系统)
4. [B角色：关卡系统+代码编辑器](#b角色关卡系统代码编辑器)
5. [C角色：AI模块+审计日志](#c角色ai模块审计日志)
6. [D角色：内容设计+定价页面](#d角色内容设计定价页面)
7. [第3周联调计划](#第3周联调计划)
8. [数据库设计](#数据库设计)
9. [接口契约文档](#接口契约文档)
10. [项目文件结构](#项目文件结构)

---

## 项目总览

### 技术栈

| 层次 | 技术 | 版本策略 | 说明 |
|------|------|---------|------|
| **前端** | HTML + HTMX + Alpine.js + Bootstrap 5 | 最新稳定版 | HTMX做数据交互，Alpine.js做前端交互 |
| **后端** | Python FastAPI | LTS（Python 3.10+） | 写RESTful API |
| **数据库** | MySQL | 已安装 | 4人各自本地MySQL，表结构统一 |
| **AI模型** | DeepSeek API | 最新 | 国内模型，无需科学上网 |
| **编辑器** | CodeMirror | 最新稳定版 | 轻量代码编辑器，组件封装预留升级 |

### 架构图

```
用户浏览器
    │
    ▼
前端 HTML 页面（含 HTMX + Alpine.js）
    │  HTMX 发送 HTTP 请求（JSON数据）
    ▼
FastAPI 后端（Python）
    ├── /api/auth/*        → 登录注册API
    ├── /api/levels/*      → 关卡数据API
    ├── /api/ai/*          → AI导师/审查官API
    ├── /api/user/*        → 用户信息/升级API
    └── /api/audit/*       → 审计日志API
    │
    ├── MySQL 数据库
    └── DeepSeek API
```

### 4人分工总览

| 角色 | 职责 | 主要技能 | 预估工作量 |
|------|------|---------|-----------|
| **A** | 用户系统（注册/登录/JWT/数据库建表） | Python FastAPI + HTML + HTMX | 3.5天 |
| **B** | 关卡系统 + 代码编辑器集成 | Python FastAPI + CodeMirror + HTMX | 4.5天 |
| **C** | AI模块 + 审计日志 | Python FastAPI + DeepSeek API + HTMX | 4天 |
| **D** | 关卡内容设计 + AI Prompt + 定价页面 | 内容写作 + 基础HTML | 4.5天 |

### 开发时间线

```
第1周 ──────── 第2周 ──────── 第3周 ─────→
──────────────────────────────────────────→
第1天：全员环境搭建 + HTMX学习
第2-4天：A开发用户系统
第2-5天：B开发关卡+编辑器
第2-5天：C开发AI+审计日志
第2-5天：D开发内容+定价
第3周：全员联调 + 修复 + 彩排
```

---

## 环境搭建指南

### 第1天：全员环境搭建 + HTMX学习

| 步骤 | 任务 | 产出物 | 产出作用 | 预计时间 |
|------|------|-------|---------|---------|
| ① | 检查Python版本（需3.10+），如没有则安装 | 可用的Python环境 | 运行项目的基础 | 30分钟 |
| ② | 创建项目文件夹 `coding_game/`，打开终端执行 `pip install fastapi uvicorn pymysql bcrypt pyjwt requests python-jose` | 项目依赖安装完成 | 后续开发不需要再花时间配置环境 | 15分钟 |
| ③ | 创建 `main.py`，写入以下代码并运行 `uvicorn main:app --reload` | 浏览器打开 http://127.0.0.1:8000 能看到 `{"message": "Hello World"}` | 确认环境没问题，可以开始写代码 | 15分钟 |
| ④ | 打开 HTMX 官方文档（https://htmx.org/docs/），照着写以下5个示例：<br>1. 点击按钮加载内容<br>2. 表单提交<br>3. 定时刷新<br>4. 点击编辑行<br>5. 搜索过滤 | HTMX学习完成，能独立写前端交互 | 能开始写前端页面 | 2小时 |
| ⑤ | 打开 Alpine.js 官方文档（https://alpinejs.dev/start-here），学习 x-data、x-show、@click、:class 四个指令 | Alpine.js学习完成 | 能做页面交互（弹窗/切换/表单） | 1小时 |

**第1天结束时的状态：** 4人都能跑通 FastAPI，都能用 HTMX 和 Alpine.js 写前端页面。

---

## A角色：用户系统

### 第2天

| 步骤 | 任务 | 产出物 | 产出作用 |
|------|------|-------|---------|
| ① | 创建 `main.py`，配置FastAPI应用，添加CORS中间件 | 项目骨架代码 | 其他3人可以直接在此基础上添加API路由 |
| ② | 创建 `database/schema.sql`，写users表的建表语句 | 数据库建表SQL文件 | 团队共享，统一数据库结构 |
| ③ | 创建 `static/` 文件夹，下载Bootstrap 5的CSS和JS文件 | 前端样式基础 | 所有页面风格统一 |
| ④ | 创建 `templates/base.html`，用Bootstrap设计导航栏（Logo、登录/注册按钮、用户头像） + 页面主体布局 | 基础页面模板 | 所有页面继承这个布局，风格统一 |
| ⑤ | 创建 `templates/index.html`，继承base.html，写首页内容（产品介绍 + 开始学习按钮） | 首页页面 | 用户访问网站时看到的第一个页面 |

**第2天结束时的状态：** 项目骨架搭建完成，其他人可以在 `main.py` 基础上添加路由，页面有统一的导航栏和样式。

---

### 第3天

| 步骤 | 任务 | 产出物 | 产出作用 |
|------|------|-------|---------|
| ① | 写 `POST /api/auth/register` API，功能：接收email+password → bcrypt加密密码 → 存入MySQL users表 → 返回成功消息 | 注册API | 前端调用这个API完成用户注册 |
| ② | 写 `POST /api/auth/login` API，功能：验证email+password → 生成JWT token → 返回token和用户信息 | 登录API | 前端调用这个API完成用户登录 |
| ③ | 创建 `templates/register.html`，用HTMX实现：填写表单 → hx-post到 `/api/auth/register` → 显示注册成功或失败 | 注册页面 | 用户能看到的注册界面 |
| ④ | 创建 `templates/login.html`，用HTMX实现：填写表单 → hx-post到 `/api/auth/login` → 登录成功跳转到关卡列表页 | 登录页面 | 用户能看到的登录界面 |
| ⑤ | 创建 `templates/logout.html` 或点击导航栏退出按钮，清除前端存储的token，跳回首页 | 登出功能 | 用户能安全退出登录 |

**第3天结束时的状态：** 用户能注册、登录、登出。注册信息存入MySQL，登录后获得JWT token。

---

### 第4天

| 步骤 | 任务 | 产出物 | 产出作用 |
|------|------|-------|---------|
| ① | 写JWT验证中间件 `@require_auth` 装饰器，功能：检查请求头中的Authorization: Bearer token → 解析token → 返回当前用户信息，如果token无效返回401错误 | JWT鉴权中间件 | 其他API需要"登录后才能访问"时，加上 `@require_auth` 即可 |
| ② | 写 `GET /api/user/profile` API，功能：返回当前登录用户的信息（邮箱、会员等级、注册时间等） | 用户信息API | 前端调用获取用户信息 |
| ③ | 创建 `templates/profile.html`，用HTMX调用 `/api/user/profile` 展示用户信息 | 用户信息页面 | 用户能看到自己的账号信息 |
| ④ | 把 `@require_auth` 中间件的代码 + `database/schema.sql` 分享到群里 | 团队共享文件 | B和C直接复制使用，不需要自己写 |

**第4天结束时的状态：** 用户系统全部完成。A的代码进入等待联调阶段，可以提前支援其他角色。

---

## B角色：关卡系统+代码编辑器

### 第2天

| 步骤 | 任务 | 产出物 | 产出作用 |
|------|------|-------|---------|
| ① | 学习CodeMirror 6：打开官方示例（https://codemirror.net/examples/），跑通"在网页里嵌入一个代码编辑器" | CodeMirror Demo跑通 | 确认编辑器能嵌入网页 |
| ② | 学习HTMX：完成"点击按钮加载数据"的示例（参考第1天全员学习内容） | HTMX学习完成 | 能写前端的交互逻辑 |
| ③ | 创建 `database/schema.sql` 补充部分，写levels表和user_progress表的建表语句 | 关卡相关建表SQL | 把SQL文件给A，A合并到总的schema.sql中 |

**第2天结束时的状态：** CodeMirror能在网页上跑起来，知道怎么嵌入HTML页面。

---

### 第3天

| 步骤 | 任务 | 产出物 | 产出作用 |
|------|------|-------|---------|
| ① | 在 `main.py` 中添加 `GET /api/levels` API，功能：从MySQL levels表读取所有关卡列表 → 返回JSON数组（包含id、title、difficulty、order_index） | 关卡列表API | 前端调用获取关卡数据 |
| ② | 在 `main.py` 中添加 `GET /api/levels/{id}` API，功能：从MySQL读取单个关卡详情 → 返回JSON（包含title、description、template_code、knowledge_point） | 关卡详情API | 前端调用获取关卡题目 |
| ③ | 创建 `templates/levels.html`，用HTMX实现：页面加载时 hx-get 调用 `/api/levels` → 把返回的关卡列表渲染为卡片（显示锁定/解锁/完成状态） | 关卡列表页面 | 用户能看到所有关卡 |

**第3天结束时的状态：** 后端能返回关卡数据，前端能展示关卡列表。但此时数据库里还没有关卡内容（等D写好后再导入）。

---

### 第4天

| 步骤 | 任务 | 产出物 | 产出作用 |
|------|------|-------|---------|
| ① | 创建 `templates/level_detail.html`，页面布局：左侧显示题目描述和知识点，右侧嵌入CodeMirror编辑器，下方提交按钮，下方显示AI审查结果区域 | 关卡详情页面HTML | 用户能看到题目并写代码 |
| ② | 在 `level_detail.html` 中嵌入CodeMirror，配置Python语法高亮、行号显示、深色主题 | 代码编辑器正常工作 | 用户能写代码，有语法高亮 |
| ③ | 用Alpine.js实现：用户点击"提交"按钮时，读取CodeMirror中的代码内容，准备发送到后端 | 提交按钮交互逻辑 | 用户写完代码能提交 |

**第4天结束时的状态：** 关卡详情页面布局完成，用户能看题目、写代码。但提交功能还需要第5天的API配合。

---

### 第5天

| 步骤 | 任务 | 产出物 | 产出作用 |
|------|------|-------|---------|
| ① | 在 `main.py` 中添加 `POST /api/levels/{id}/submit` API，功能：接收用户提交的代码 → 保存到user_progress表 → 返回成功 | 提交代码API | 用户写完代码能提交保存 |
| ② | 用HTMX实现：提交代码后自动刷新页面下方的"AI审查结果"区域（hx-trigger，hx-target） | 提交后自动展示 | 用户体验好，不需要手动刷新 |
| ③ | 从D那里拿到关卡内容JSON文件，写一个 `import_levels.py` 脚本导入到MySQL的levels表中 | 关卡数据导入完成 | 网站上有真实的关卡内容可以展示了 |

**第5天结束时的状态：** 关卡系统全部完成。用户能看关卡列表 → 进入关卡 → 看题目 → 写代码 → 提交 → 看到AI审查结果。

---

## C角色：AI模块+审计日志

### 第2天

| 步骤 | 任务 | 产出物 | 产出作用 |
|------|------|-------|---------|
| ① | 注册DeepSeek账号（https://platform.deepseek.com/），获取API Key（注意保管好，不要泄露） | DeepSeek账号和API Key | 后续调用AI的基础 |
| ② | 在Python中写一个测试脚本 `test_deepseek.py`，调用DeepSeek API测试是否能正常返回回答 | DeepSeek API调通 | 确认能用DeepSeek |
| ③ | 学习HTMX：完成"表单提交后显示结果"的示例（参考第1天全员学习内容） | HTMX学习完成 | 能写AI聊天界面的交互 |

**第2天结束时的状态：** DeepSeek API能正常调用，知道怎么发送请求和接收响应。

---

### 第3天

| 步骤 | 任务 | 产出物 | 产出作用 |
|------|------|-------|---------|
| ① | 创建 `services/deepseek.py`，封装两个函数：<br>`ask_tutor(question, level_context)` → 调用DeepSeek导师角色<br>`ask_reviewer(code, level_context)` → 调用DeepSeek审查官角色 | AI调用工具函数 | 其他代码中直接调用，不用重复写API请求逻辑 |
| ② | 在 `main.py` 中添加 `POST /api/ai/tutor` API，功能：接收用户问题 + 当前关卡ID → 调用 `ask_tutor()` → 返回AI回答 | AI导师API | 前端调用获得AI回答 |
| ③ | 在 `main.py` 中添加 `POST /api/ai/review` API，功能：接收用户代码 + 当前关卡ID → 调用 `ask_reviewer()` → 返回AI评价 | AI审查官API | 前端调用获得代码审查意见 |

**第3天结束时的状态：** AI导师和审查官的后端API都写好了，可以用Postman或curl测试是否能正常调用。

---

### 第4天

| 步骤 | 任务 | 产出物 | 产出作用 |
|------|------|-------|---------|
| ① | 创建 `templates/ai_tutor.html`，设计聊天界面：上方显示对话记录列表，下方输入框 + 发送按钮，用HTMX实现"发送消息→显示AI回复" | AI导师聊天页面 | 用户能跟AI导师对话 |
| ② | 创建 `templates/ai_review.html`（或嵌入到关卡详情页中），用HTMX实现"提交代码→显示审查结果" | AI审查展示页面 | 用户能看到AI对自己代码的评价 |
| ③ | 从D那里拿到AI Prompt配置文件，配置到 `services/deepseek.py` 中 | Prompt配置完成 | AI导师和审查官按预期方式回答 |

**第4天结束时的状态：** AI导师聊天界面和AI审查展示界面都做好了，能跟DeepSeek正常交互。

---

### 第5天

| 步骤 | 任务 | 产出物 | 产出作用 |
|------|------|-------|---------|
| ① | 创建 `database/schema.sql` 补充部分，写audit_logs表建表语句 | 审计日志建表SQL | 把SQL文件给A，A合并到总的schema.sql中 |
| ② | 在 `main.py` 中添加审计日志记录逻辑：在登录、提交代码、升级等关键操作中自动调用记录函数 | 审计日志功能 | 安全合规要求，演示时能展示 |
| ③ | 创建 `templates/audit_logs.html`，用HTMX加载审计日志列表，展示时间、用户、操作类型、详情 | 审计日志管理页面 | 演示时展示"我们记录了所有操作" |
| ④ | 写 `GET /api/audit/logs` API，功能：返回审计日志列表（按时间倒序） | 审计日志API | 前端调用展示日志 |

**第5天结束时的状态：** AI模块和审计日志全部完成。C的代码进入等待联调阶段，可以提前支援其他角色。

---

## D角色：内容设计+定价页面

### 第2天

| 步骤 | 任务 | 产出物 | 产出作用 |
|------|------|-------|---------|
| ① | 设计知识体系：列出10个关卡的知识点递进路线 | 知识体系大纲文档 | 团队成员了解关卡设计思路 |
| ② | 为每个关卡写：关卡编号、标题、难度等级（1-5星） | 关卡元数据表 | 给B导入数据库用 |

**第2天结束时的状态：** 10个关卡的主题、标题、难度都确定好了。

---

### 第3天

| 步骤 | 任务 | 产出物 | 产出作用 |
|------|------|-------|---------|
| ① | 写关卡1-5的详细内容：题目描述（200字左右，告诉用户要做什么）+ 初始代码模板（用户从这里开始写）+ 答案代码 + 知识点说明 + 提示 | 关卡1-5内容（JSON格式） | 用户能看到的题目和模板 |
| ② | 将关卡1-5内容JSON文件交给B | 文件交接 | B导入到数据库，关卡页面就有内容了 |

**第3天结束时的状态：** 前5个关卡的内容写好了，交给B导入数据库。

---

### 第4天

| 步骤 | 任务 | 产出物 | 产出作用 |
|------|------|-------|---------|
| ① | 写关卡6-10的详细内容（同上） | 关卡6-10内容（JSON格式） | 同上 |
| ② | 将关卡6-10内容JSON文件交给B | 文件交接 | B导入数据库 |
| ③ | 写AI导师的System Prompt（告诉AI：你是编程导师，面向零基础，用通俗易懂的方式解释，不要直接给答案） | 导师Prompt文档 | 交给C，C配置到DeepSeek调用中 |
| ④ | 写AI审查官的System Prompt（告诉AI：你是代码审查官，从代码正确性、可读性、效率三个角度评价，给出具体改进建议） | 审查官Prompt文档 | 交给C，C配置到DeepSeek调用中 |

**第4天结束时的状态：** 全部10个关卡内容 + 两个System Prompt都写好了，交给了B和C。

---

### 第5天

| 步骤 | 任务 | 产出物 | 产出作用 |
|------|------|-------|---------|
| ① | 创建 `templates/pricing.html`，设计定价页面：免费版（3关/每天5次AI对话）vs Pro版（全部解锁/无限AI）对比，用Bootstrap卡片布局+HTMX实现"点击升级→切换tier" | 定价页面HTML | 展示商业模式，商业基线要求 |
| ② | 在 `main.py` 中添加 `POST /api/user/upgrade` API，功能：接收用户ID → 将tier改为"pro" | 升级API | 模拟付费升级逻辑 |
| ③ | 写免费配额检查逻辑：在C的AI API调用前检查用户tier和当天使用次数，超限返回提示"升级Pro" | 配额控制功能 | 展示免费增值模式 |
| ④ | 写关卡上下文提示（10个），每个关卡告诉AI"用户正在学什么/常见错误/教学重点"，交给C | 关卡上下文JSON文件 | C配置到DeepSeek调用中，AI回答更精准 |

**第5天结束时的状态：** 内容设计、定价页面、配额控制全部完成。D的代码进入等待联调阶段。

---

## 第3周联调计划

### 联调第1天：前后端联调

| 时间 | 任务 | 参与人 | 具体内容 | 产出 |
|------|------|-------|---------|------|
| 上午 | A检查自己的API | A | 检查B/C/D的前端是否能正常调用A写的API（注册/登录/用户信息） | 确认API可调用 |
| 上午 | B检查自己的API | B | 检查关卡列表、关卡详情、提交代码API是否正常 | 确认API可调用 |
| 下午 | C检查自己的API | C | 检查AI导师、AI审查、审计日志API是否正常 | 确认API可调用 |
| 下午 | D检查定价页面 | D | 检查定价页面展示、升级功能是否正常 | 确认页面正常 |

### 联调第2天：合并代码+修复Bug

| 时间 | 任务 | 参与人 | 具体内容 |
|------|------|-------|---------|
| 上午 | 合并代码 | 全员 | 把4个人的代码合并到一个项目，A的main.py作为主文件，其他人添加路由 |
| 上午 | 修复路由冲突 | 全员 | 确保所有API路径不重复，所有页面能正常跳转 |
| 下午 | 修复样式问题 | 全员 | 统一页面风格，确保所有页面看起来是一个整体 |

### 联调第3天：跑通核心流程

| 时间 | 任务 | 参与人 | 具体内容 |
|------|------|-------|---------|
| 上午 | 跑通完整流程 | 全员 | 走一遍：注册→登录→首页→关卡列表→进入第1关→看题目→写代码→问AI导师→提交→看AI审查→进入下一关 |
| 下午 | 修复Bug | 全员 | 修复流程中出现的各种问题 |

### 联调第4天：优化+准备演示

| 时间 | 任务 | 参与人 | 具体内容 |
|------|------|-------|---------|
| 上午 | 优化界面 | 全员 | 修复不美观的样式、调整布局 |
| 上午 | 准备演示数据 | D | 注册3个测试账号（不同进度），通关几个关卡，让演示时有数据可看 |
| 下午 | 写演示脚本 | 全员 | 确定演示流程、谁讲什么、重点展示什么功能 |
| 下午 | 安装OBS录屏软件 | 全员 | 准备录屏备份 |

### 联调第5天：彩排

| 时间 | 任务 | 参与人 | 具体内容 |
|------|------|-------|---------|
| 上午 | 完整彩排 | 全员 | 从头到尾走一遍演示流程，确保不卡顿 |
| 下午 | 查漏补缺 | 全员 | 修复彩排中发现的问题，准备应对评委提问 |

---

## 数据库设计

### 建表SQL

```sql
-- 创建数据库
CREATE DATABASE coding_game CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE coding_game;

-- 用户表
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    tier ENUM('basic', 'pro') DEFAULT 'basic',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 关卡表
CREATE TABLE levels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    template_code TEXT,
    answer_code TEXT,
    knowledge_point TEXT,
    hint TEXT,
    difficulty INT DEFAULT 1,  -- 1-5
    order_index INT NOT NULL,  -- 关卡顺序
    is_premium BOOLEAN DEFAULT FALSE,  -- 是否Pro专属
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用户关卡进度表
CREATE TABLE user_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    level_id INT NOT NULL,
    status ENUM('locked', 'unlocked', 'completed') DEFAULT 'locked',
    submitted_code TEXT,
    ai_review TEXT,
    completed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (level_id) REFERENCES levels(id)
);

-- 审计日志表
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(50) NOT NULL,  -- 'login', 'register', 'submit_code', 'upgrade'
    detail TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 数据关系说明

```
users 1 ──→ N user_progress N ←── 1 levels
  │
  └──→ N audit_logs
```

---

## 接口契约文档

### 用户模块

| 方法 | 路径 | 请求体 | 响应 | 说明 |
|------|------|--------|------|------|
| POST | `/api/auth/register` | `{"email": "xxx", "password": "xxx"}` | `{"message": "注册成功", "token": "xxx"}` | 注册新用户 |
| POST | `/api/auth/login` | `{"email": "xxx", "password": "xxx"}` | `{"token": "xxx", "user": {"id": 1, "email": "xxx", "tier": "basic"}}` | 用户登录 |
| GET | `/api/user/profile` | Header: `Authorization: Bearer xxx` | `{"id": 1, "email": "xxx", "tier": "basic", "created_at": "2026-07-13"}` | 获取用户信息 |
| POST | `/api/user/upgrade` | Header: `Authorization: Bearer xxx` | `{"message": "升级成功", "tier": "pro"}` | 升级为Pro |

### 关卡模块

| 方法 | 路径 | 请求体 | 响应 | 说明 |
|------|------|--------|------|------|
| GET | `/api/levels` | Header: `Authorization: Bearer xxx` | `[{"id": 1, "title": "认识变量", "difficulty": 1, "status": "completed"}, ...]` | 获取关卡列表 |
| GET | `/api/levels/{id}` | Header: `Authorization: Bearer xxx` | `{"id": 1, "title": "认识变量", "description": "...", "template_code": "..."}` | 获取关卡详情 |
| POST | `/api/levels/{id}/submit` | Header: `Authorization: Bearer xxx`, Body: `{"code": "..."}` | `{"message": "提交成功", "review": "AI审查结果..."}` | 提交代码 |

### AI模块

| 方法 | 路径 | 请求体 | 响应 | 说明 |
|------|------|--------|------|------|
| POST | `/api/ai/tutor` | Header: `Authorization: Bearer xxx`, Body: `{"level_id": 1, "question": "..."}` | `{"answer": "AI的回答..."}` | 向AI导师提问 |
| POST | `/api/ai/review` | Header: `Authorization: Bearer xxx`, Body: `{"level_id": 1, "code": "..."}` | `{"review": "AI的审查意见..."}` | 提交代码审查 |

### 审计日志模块

| 方法 | 路径 | 请求体 | 响应 | 说明 |
|------|------|--------|------|------|
| GET | `/api/audit/logs` | Header: `Authorization: Bearer xxx` | `[{"id": 1, "user_id": 1, "action": "login", "detail": "...", "created_at": "..."}, ...]` | 获取审计日志列表 |

---

## 项目文件结构

```
coding_game/                    # 项目根目录
├── main.py                     # FastAPI应用入口，所有API路由
├── services/
│   └── deepseek.py             # DeepSeek API调用封装
├── database/
│   └── schema.sql              # 数据库建表语句
├── import_levels.py            # 导入关卡内容到数据库的脚本
├── templates/                  # 前端HTML页面
│   ├── base.html               # 基础布局模板（导航栏+主体）
│   ├── index.html              # 首页
│   ├── register.html           # 注册页面
│   ├── login.html              # 登录页面
│   ├── profile.html            # 用户信息页面
│   ├── levels.html             # 关卡列表页面
│   ├── level_detail.html       # 关卡详情页面（含编辑器+AI审查）
│   ├── ai_tutor.html           # AI导师聊天页面
│   ├── pricing.html            # 定价页面
│   └── audit_logs.html         # 审计日志页面
├── static/                     # 静态文件
│   ├── css/
│   │   └── bootstrap.min.css   # Bootstrap样式
│   └── js/
│       ├── bootstrap.min.js    # Bootstrap JS
│       ├── htmx.min.js         # HTMX库
│       └── alpine.min.js       # Alpine.js库
└── data/                       # 数据文件（由D生成）
    ├── levels_content.json     # 10个关卡内容
    └── ai_prompts.json         # AI Prompt配置
```

---

## 合作点清单

| 合作点 | 时间 | 发送方 | 接收方 | 内容 | 格式 | 说明 |
|-------|------|-------|-------|------|------|------|
| ① | 第2天 | A | B、C、D | 数据库建表SQL + JWT中间件代码 | `.sql` + `.py` 文件 | 复制到各自项目中使用 |
| ② | 第3天 | D | B | 关卡1-5内容 | `.json` 文件 | B导入到数据库 |
| ③ | 第4天 | D | B | 关卡6-10内容 | `.json` 文件 | B导入到数据库 |
| ④ | 第4天 | D | C | AI导师Prompt + 审查官Prompt | `.md` 或 `.json` 文件 | C配置到DeepSeek调用中 |
| ⑤ | 第5天 | D | C | 关卡上下文提示（10个） | `.json` 文件 | C配置到DeepSeek调用中 |
| ⑥ | 第3周 | 全员 | 全员 | 代码合并 | 代码文件 | 联调时合并所有代码 |

---

## 演示准备清单

### 演示前需要准备

| 事项 | 负责人 | 时间 |
|------|-------|------|
| 注册3个测试账号（不同进度） | D | 第3周第4天 |
| 用测试账号通关几个关卡，让数据库有数据 | D | 第3周第4天 |
| 准备演示脚本（谁讲什么、展示什么功能） | 全员 | 第3周第4天 |
| 安装OBS录屏软件 | 全员 | 第3周第4天 |
| 录制一份完整的演示视频作为备份 | 全员 | 第3周第5天 |

### 演示流程建议

```
1. 开场（1分钟）：介绍项目背景和目标用户
2. 首页展示（1分钟）：展示产品定位
3. 注册/登录（2分钟）：展示用户系统
4. 关卡列表（1分钟）：展示10个关卡的知识体系
5. 进入关卡（3分钟）：展示题目→写代码→问AI导师→提交→看AI审查
6. 定价页面（1分钟）：展示商业模式（免费版vs Pro版）
7. 审计日志（1分钟）：展示安全合规能力
8. 总结（1分钟）：技术栈、团队分工、未来展望
```

---

## 项目总结写作指南

### 项目总结应包含的内容

```
项目总结报告大纲：
├── 项目背景与目标
│   ├── 为什么做这个项目
│   └── 目标用户是谁
├── 商业基线
│   ├── 目标用户画像
│   ├── 商业模式（免费增值）
│   └── 竞品分析（夜曲编程等）
├── 技术方案选择
│   ├── 为什么选FastAPI+HTMX（对比其他方案的考量）
│   └── 技术栈清单
├── 功能实现
│   ├── 用户系统（注册/登录/JWT）
│   ├── 关卡系统（10个关卡，闯关式学习）
│   ├── AI导师（DeepSeek驱动的智能教学）
│   ├── AI审查官（代码质量评估）
│   └── 定价与配额（免费增值模式展示）
├── 数据库设计
│   ├── ER图（文字说明或截图）
│   └── 4张表的关系
├── 安全合规措施
│   ├── 密码加密存储（bcrypt）
│   ├── JWT鉴权
│   ├── API Key保护（不暴露前端）
│   └── 审计日志（关键操作记录）
├── 测试策略与结果
│   ├── 手动测试覆盖的核心流程
│   └── 测试结果
├── 遇到的困难与解决方案
│   ├── 技术难点（如：DeepSeek集成、CodeMirror配置）
│   └── 团队协作（如：第一次合作如何磨合）
├── 个人收获与团队协作总结
│   └── 每人写一段个人总结
└── 未来展望
    ├── 可以改进的地方（如：升级Monaco编辑器、部署到云服务）
    └── 扩展方向（如：扩展到青少年用户）
```

---

> 本文档是开发阶段的核心指南，4人按照各自角色的任务表逐日推进即可。
> 遇到问题随时沟通，第3周联调时统一解决。