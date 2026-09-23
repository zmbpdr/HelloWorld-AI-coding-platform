/**
 * admin.ts - 管理后台 API 封装
 *
 * 封装管理后台所有后端 API 调用，按模块划分：
 * 认证、仪表盘、课程管理、用户管理、成就管理、提交审计、系统设置。
 */

import apiClient from './client'
import axios from 'axios'

// ==================== 认证接口 ====================

/** 管理员登录 */
export async function adminLogin(username: string, password: string) {
  const { data } = await apiClient.post('/auth/login', { username, password })
  return data
}

/** 获取当前管理员信息 */
export async function getAdminInfo() {
  const { data } = await apiClient.get('/auth/me')
  return data
}

// ==================== 仪表盘接口 ====================

/** 获取仪表盘统计数据 */
export async function getDashboardStats() {
  const { data } = await apiClient.get('/dashboard')
  return data
}

/** 获取仪表盘趋势图表数据 */
export async function getDashboardChart(days = 7) {
  const { data } = await apiClient.get('/dashboard/chart', { params: { days } })
  return data
}

// ==================== 课程管理接口 ====================

/** 获取课程列表 */
export async function getLessons(params?: { page?: number; page_size?: number; language_id?: number }) {
  const { data } = await apiClient.get('/lessons', { params })
  return data
}

/** 获取课程详情 */
export async function getLessonDetail(id: number) {
  const { data } = await apiClient.get(`/lessons/${id}`)
  return data
}

/** 创建课程 */
export async function createLesson(lessonData: Record<string, unknown>) {
  const { data } = await apiClient.post('/lessons', lessonData)
  return data
}

/** 更新课程 */
export async function updateLesson(id: number, lessonData: Record<string, unknown>) {
  const { data } = await apiClient.put(`/lessons/${id}`, lessonData)
  return data
}

/** 删除课程 */
export async function deleteLesson(id: number) {
  const { data } = await apiClient.delete(`/lessons/${id}`)
  return data
}

/** 切换课程发布/下架状态 */
export async function togglePublishLesson(id: number) {
  const { data } = await apiClient.post(`/lessons/${id}/publish`)
  return data
}

// ==================== 用户管理接口 ====================

/** 获取用户列表 */
export async function getUsers(params?: { page?: number; page_size?: number; search?: string }) {
  const { data } = await apiClient.get('/users', { params })
  return data
}

/** 获取用户详情 */
export async function getUserDetail(id: number) {
  const { data } = await apiClient.get(`/users/${id}`)
  return data
}

/** 封禁/解封用户 */
export async function banUser(id: number, isBanned: boolean, reason?: string) {
  const { data } = await apiClient.put(`/users/${id}/ban`, { is_banned: isBanned, reason })
  return data
}

// ==================== 成就管理接口 ====================

/** 获取成就列表 */
export async function getAchievements() {
  const { data } = await apiClient.get('/achievements')
  return data
}

/** 创建成就 */
export async function createAchievement(achievementData: Record<string, unknown>) {
  const { data } = await apiClient.post('/achievements', achievementData)
  return data
}

/** 更新成就 */
export async function updateAchievement(id: number, achievementData: Record<string, unknown>) {
  const { data } = await apiClient.put(`/achievements/${id}`, achievementData)
  return data
}

// ==================== 提交审计接口 ====================

/** 获取提交记录列表 */
export async function getSubmissions(params?: { page?: number; page_size?: number; status?: string }) {
  const { data } = await apiClient.get('/submissions', { params })
  return data
}

/** 获取提交详情 */
export async function getSubmissionDetail(id: number) {
  const { data } = await apiClient.get(`/submissions/${id}`)
  return data
}

// ==================== 文件上传接口 ====================

/** 上传教程图片 — 返回图片 URL */
export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await apiClient.post('/lessons/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.url
}

// ==================== 系统设置接口 ====================

/** 获取所有系统设置 */
export async function getSettings() {
  const { data } = await apiClient.get('/settings')
  return data
}

/** 更新单个系统设置 */
export async function updateSetting(key: string, value: string) {
  const { data } = await apiClient.put(`/settings/${key}`, { value })
  return data
}


// ==================== 题库管理接口 ====================

/** 题目列表项 */
export interface QuestionListItem {
  id: number
  title: string
  slug: string
  language_id: number
  difficulty: string | null
  question_type: string
  knowledge_tags: string[]
  order: number
  is_active: boolean
  created_at?: string | null
  updated_at?: string | null
}

/** 题目详情（含完整字段） */
export interface QuestionDetail extends QuestionListItem {
  description?: string | null
  content?: string | null
  options?: unknown
  answer?: string | null
  explanation?: string | null
  test_cases?: unknown
  starter_code?: string | null
}

/** 题目列表响应 */
export interface QuestionListResult {
  items: QuestionListItem[]
  total: number
  page: number
  page_size: number
}

/** 导入预检查错误项 */
export interface ImportErrorItem {
  row: number
  field: string
  message: string
}

/** 导入预检查报告 */
export interface ImportReport {
  errors: ImportErrorItem[]
  total: number
  valid_count: number
  error_count: number
}

/** 语言信息（用户端公开接口） */
export interface LanguageItem {
  id: number
  slug: string
  name: string
  [key: string]: unknown
}

/** 获取编程语言列表（公开接口 /api/v1/languages） */
export async function getLanguages(): Promise<LanguageItem[]> {
  const { data } = await axios.get('/api/v1/languages')
  return data
}

/** 获取题目列表（分页 + 语言/难度/题型筛选 + 关键词搜索） */
export async function getQuestions(params?: {
  page?: number
  page_size?: number
  language_id?: number
  difficulty?: string
  question_type?: string
  keyword?: string
}): Promise<QuestionListResult> {
  const { data } = await apiClient.get('/questions', { params })
  return data
}

/** 获取题目详情 */
export async function getQuestionDetail(id: number): Promise<QuestionDetail> {
  const { data } = await apiClient.get(`/questions/${id}`)
  return data
}

/** 新增题目 */
export async function createQuestion(payload: Record<string, unknown>) {
  const { data } = await apiClient.post('/questions', payload)
  return data
}

/** 编辑题目 */
export async function updateQuestion(id: number, payload: Record<string, unknown>) {
  const { data } = await apiClient.put(`/questions/${id}`, payload)
  return data
}

/** 删除题目（软删除） */
export async function deleteQuestion(id: number) {
  const { data } = await apiClient.delete(`/questions/${id}`)
  return data
}

/** 发布/下架题目 */
export async function togglePublishQuestion(id: number) {
  const { data } = await apiClient.post(`/questions/${id}/publish`)
  return data
}

/** 批量导入题目（上传 Excel/CSV，返回预检查报告；后端支持 confirm 参数确认入库） */
export async function importQuestions(file: File, confirm = false): Promise<ImportReport> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('confirm', String(confirm))
  const { data } = await apiClient.post('/questions/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
  return data
}

/** 批量导出题目（返回 CSV 文件流） */
export async function exportQuestions(params?: {
  language_id?: number
  difficulty?: string
  question_type?: string
}): Promise<Blob> {
  const { data } = await apiClient.get('/questions/export', {
    params,
    responseType: 'blob',
  })
  return data
}

/** 获取关卡已关联的题目 ID 列表 */
export async function getLessonQuestionIds(lessonId: number): Promise<number[]> {
  const { data } = await apiClient.get(`/lessons/${lessonId}/questions`)
  return data
}

/** 保存关卡关联题目（全量替换） */
export async function setLessonQuestions(lessonId: number, questionIds: number[]) {
  const { data } = await apiClient.put(`/lessons/${lessonId}/questions`, {
    question_ids: questionIds,
  })
  return data
}

// ==================== 诊断题管理接口 ====================

/** 诊断题列表项 */
export interface DiagnosticQuestionItem {
  id: number
  question: string
  options: string[]
  answer: string
  tag: string
  order: number
  is_active: boolean
  created_at?: string | null
  updated_at?: string | null
}

/** 诊断题列表响应 */
export interface DiagnosticQuestionListResult {
  items: DiagnosticQuestionItem[]
  total: number
  page: number
  page_size: number
}

/** 获取诊断题列表（分页 + 标签筛选） */
export async function getDiagnosticQuestions(params?: {
  page?: number
  page_size?: number
  tag?: string
}): Promise<DiagnosticQuestionListResult> {
  const { data } = await apiClient.get('/diagnostic-questions', { params })
  return data
}

/** 获取诊断题详情 */
export async function getDiagnosticQuestion(id: number): Promise<DiagnosticQuestionItem> {
  const { data } = await apiClient.get(`/diagnostic-questions/${id}`)
  return data
}

/** 新增诊断题 */
export async function createDiagnosticQuestion(payload: Record<string, unknown>) {
  const { data } = await apiClient.post('/diagnostic-questions', payload)
  return data
}

/** 编辑诊断题 */
export async function updateDiagnosticQuestion(id: number, payload: Record<string, unknown>) {
  const { data } = await apiClient.put(`/diagnostic-questions/${id}`, payload)
  return data
}

/** 删除诊断题（软删除） */
export async function deleteDiagnosticQuestion(id: number) {
  const { data } = await apiClient.delete(`/diagnostic-questions/${id}`)
  return data
}

/** 启用/停用诊断题 */
export async function toggleDiagnosticQuestion(id: number) {
  const { data } = await apiClient.post(`/diagnostic-questions/${id}/toggle`)
  return data
}

// ==================== 诊断评分规则接口 ====================

/** 诊断评分规则单条 */
export interface ScoringRule {
  min_score: number
  max_score: number
  skill_level: 'beginner' | 'intermediate' | 'advanced'
  recommended_start: string
  message: string
}

/** 默认评分规则（后端未配置或配置异常时的兜底展示值，与后端 seed 保持一致） */
export const DEFAULT_SCORING_RULES: ScoringRule[] = [
  { min_score: 0, max_score: 30, skill_level: 'beginner', recommended_start: 'python-01-hello-world', message: '看起来你刚开始接触编程，没关系！我们从最基础的开始，慢慢来。' },
  { min_score: 31, max_score: 60, skill_level: 'beginner', recommended_start: 'python-03-variables', message: '你已经有一些基础了，但还需要巩固。建议跳过最基础的 Hello World 和变量，从条件判断开始。' },
  { min_score: 61, max_score: 80, skill_level: 'intermediate', recommended_start: 'python-08-loops', message: '基础掌握得不错！建议直接进入循环和函数的学习。' },
  { min_score: 81, max_score: 100, skill_level: 'advanced', recommended_start: 'python-15-functions', message: '你的基础很扎实！建议挑战更高级的内容，也可以尝试其他编程语言。' },
]

/** 获取诊断评分规则（从系统设置读取并解析 JSON） */
export async function getDiagnosticScoringRules(): Promise<ScoringRule[]> {
  const data = await getSettings()
  const items = data?.items ?? data
  const entry = Array.isArray(items)
    ? items.find((i: { key?: string }) => i.key === 'diagnostic_scoring_rules')
    : items?.['diagnostic_scoring_rules']
  const raw = entry?.value
  if (!raw) return DEFAULT_SCORING_RULES
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_SCORING_RULES
  } catch {
    return DEFAULT_SCORING_RULES
  }
}

/** 保存诊断评分规则（JSON 序列化后写入系统设置） */
export async function saveDiagnosticScoringRules(rules: ScoringRule[]) {
  return updateSetting('diagnostic_scoring_rules', JSON.stringify(rules))
}

// ==================== 文件导入解析接口 ====================

/** 解析 Word 文档（.docx）为 Markdown — 返回 { markdown, images } */
export async function parseWordFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await apiClient.post('/lessons/parse-word', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  })
  return data as { markdown: string; images: number }
}

/** 解析 PDF 文档为 Markdown — 返回 { markdown, images, pages } */
export async function parsePdfFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await apiClient.post('/lessons/parse-pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  })
  return data as { markdown: string; images: number; pages: number }
}

// ==================== RAG 检索管理接口 ====================

/** RAG 索引状态 */
export interface RagStatus {
  total_indexed: number
  collection_name: string
  embedding_model: string
  storage_path: string
  error?: string
}

/** RAG 检索结果项 */
export interface RagSearchResult {
  content: string
  lesson_title: string
  lesson_id: number
  lesson_slug: string
  language: string
  knowledge_tags: string[]
  score: number
}

/** 获取 RAG 索引状态 */
export async function getRagStatus(): Promise<RagStatus> {
  const { data } = await apiClient.get('/rag/status')
  return data
}

/** 全量索引所有课程（后台任务，立即返回） */
export async function ragIndexAll() {
  const { data } = await apiClient.post('/rag/index-all')
  return data
}

/** 索引单篇课程 */
export async function ragIndexLesson(lessonId: number) {
  const { data } = await apiClient.post(`/rag/index-lesson/${lessonId}`)
  return data
}

/** 删除单篇课程索引 */
export async function ragDeleteLesson(lessonId: number) {
  const { data } = await apiClient.delete(`/rag/index-lesson/${lessonId}`)
  return data
}

/** 检索测试 */
export async function ragSearch(
  q: string,
  top_k?: number,
  tag?: string,
): Promise<{ query: string; results: RagSearchResult[]; count: number }> {
  const { data } = await apiClient.get('/rag/search', {
    params: { q, top_k, tag },
  })
  return data
}