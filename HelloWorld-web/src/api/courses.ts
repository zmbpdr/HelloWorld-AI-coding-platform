/**
 * 课程 API 模块
 * 提供编程语言课程列表、详情和地图数据的接口调用
 */
import apiClient from './client'
import type { LanguageResponse, LanguageDetail } from './courses.types'

/** 获取所有语言列表 */
export async function getLanguages(): Promise<LanguageResponse[]> {
  const { data } = await apiClient.get<LanguageResponse[]>('/languages')
  return data
}

/** 获取语言详情 */
export async function getLanguageDetail(slug: string): Promise<LanguageDetail> {
  const { data } = await apiClient.get<LanguageDetail>(`/languages/${slug}`)
  return data
}

/** 获取语言闯关地图（含解锁状态） */
export async function getLanguageMap(slug: string): Promise<LanguageDetail> {
  const { data } = await apiClient.get<LanguageDetail>(`/languages/${slug}/map`)
  return data
}
