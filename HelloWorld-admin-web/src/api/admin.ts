/**
 * admin.ts - 管理后台 API 封装
 *
 * 封装管理后台所有后端 API 调用，按模块划分：
 * 认证、仪表盘、课程管理、用户管理、成就管理、提交审计、系统设置。
 */

import apiClient from './client'

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
