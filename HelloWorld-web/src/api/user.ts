/**
 * 用户 API 模块
 * 提供用户统计、成就、会员信息获取和升级的接口调用
 */
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

export interface MembershipInfo {
  membership_tier: 'free' | 'pro'
  ai_calls_used: number
  ai_calls_limit: number | null
  is_unlimited: boolean
}

export async function getMyMembership(): Promise<MembershipInfo> {
  const { data } = await apiClient.get<MembershipInfo>('/users/me/membership')
  return data
}

export async function upgradeToPro(): Promise<MembershipInfo> {
  const { data } = await apiClient.post<MembershipInfo>('/users/me/upgrade', { plan: 'pro' })
  return data
}
