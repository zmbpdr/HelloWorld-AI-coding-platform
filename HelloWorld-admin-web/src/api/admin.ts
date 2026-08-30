import apiClient from './client'

// === 认证 ===
export async function adminLogin(username: string, password: string) {
  const { data } = await apiClient.post('/auth/login', { username, password })
  return data
}

export async function getAdminInfo() {
  const { data } = await apiClient.get('/auth/me')
  return data
}

// === 仪表盘 ===
export async function getDashboardStats() {
  const { data } = await apiClient.get('/dashboard')
  return data
}

export async function getDashboardChart(days = 7) {
  const { data } = await apiClient.get('/dashboard/chart', { params: { days } })
  return data
}

// === 课程管理 ===
export async function getLessons(params?: { page?: number; page_size?: number; language_id?: number }) {
  const { data } = await apiClient.get('/lessons', { params })
  return data
}

export async function getLessonDetail(id: number) {
  const { data } = await apiClient.get(`/lessons/${id}`)
  return data
}

export async function createLesson(lessonData: Record<string, unknown>) {
  const { data } = await apiClient.post('/lessons', lessonData)
  return data
}

export async function updateLesson(id: number, lessonData: Record<string, unknown>) {
  const { data } = await apiClient.put(`/lessons/${id}`, lessonData)
  return data
}

export async function deleteLesson(id: number) {
  const { data } = await apiClient.delete(`/lessons/${id}`)
  return data
}

export async function togglePublishLesson(id: number) {
  const { data } = await apiClient.post(`/lessons/${id}/publish`)
  return data
}

export async function uploadLessonImage(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await apiClient.post('/lessons/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

// === 用户管理 ===
export async function getUsers(params?: { page?: number; page_size?: number; search?: string }) {
  const { data } = await apiClient.get('/users', { params })
  return data
}

export async function getUserDetail(id: number) {
  const { data } = await apiClient.get(`/users/${id}`)
  return data
}

export async function banUser(id: number, isBanned: boolean, reason?: string) {
  const { data } = await apiClient.put(`/users/${id}/ban`, { is_banned: isBanned, reason })
  return data
}

// === 成就管理 ===
export async function getAchievements() {
  const { data } = await apiClient.get('/achievements')
  return data
}

export async function createAchievement(achievementData: Record<string, unknown>) {
  const { data } = await apiClient.post('/achievements', achievementData)
  return data
}

export async function updateAchievement(id: number, achievementData: Record<string, unknown>) {
  const { data } = await apiClient.put(`/achievements/${id}`, achievementData)
  return data
}

// === 提交审计 ===
export async function getSubmissions(params?: { page?: number; page_size?: number; status?: string }) {
  const { data } = await apiClient.get('/submissions', { params })
  return data
}

export async function getSubmissionDetail(id: number) {
  const { data } = await apiClient.get(`/submissions/${id}`)
  return data
}

// === 系统设置 ===
export async function getSettings() {
  const { data } = await apiClient.get('/settings')
  return data
}

export async function updateSetting(key: string, value: string) {
  const { data } = await apiClient.put(`/settings/${key}`, { value })
  return data
}
