import apiClient from './client'

/** 获取当前用户统计 */
export async function getMyStats() {
  const { data } = await apiClient.get('/users/me/stats')
  return data
}

/** 获取当前用户成就 */
export async function getMyAchievements() {
  const { data } = await apiClient.get('/users/me/achievements')
  return data
}
