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