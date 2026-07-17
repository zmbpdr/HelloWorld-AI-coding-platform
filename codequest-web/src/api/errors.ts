import apiClient from './client'

export interface ErrorItem {
  id: number
  lesson_id: number
  error_type: 'syntax' | 'logic' | 'boundary' | 'performance'
  error_code: string
  ai_analysis: string
  is_resolved: boolean
  created_at: string
}

export interface ErrorStats {
  syntax: number
  logic: number
  boundary: number
  performance: number
}

export interface ErrorsResponse {
  errors: ErrorItem[]
  stats: ErrorStats
}

export interface ErrorsParams {
  type?: 'syntax' | 'logic' | 'boundary' | 'performance'
  resolved?: boolean
}

/** 获取错题列表 */
export async function getErrors(params?: ErrorsParams): Promise<ErrorsResponse> {
  const { data } = await apiClient.get<ErrorsResponse>('/errors', { params })
  return data
}

/** 标记错题已解决 */
export async function resolveError(errorId: number): Promise<{ id: number; is_resolved: boolean }> {
  const { data } = await apiClient.patch(`/errors/${errorId}/resolve`)
  return data
}
