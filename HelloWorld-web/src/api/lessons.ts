/**
 * 课时 API 模块
 * 提供课时详情、代码提交和获取提示的接口调用
 * 包含 LessonDetail、TestResult、SubmitResult 等类型定义
 */
import apiClient from './client'

export interface LessonDetail {
  id: number
  title: string
  slug: string
  description: string | null
  content: string | null
  order: number
  difficulty: string | null
  xp_reward: number
  starter_code: string | null
  hint: string | null
  status: string | null
  best_code: string | null
  best_score: number
  attempts: number
}

export interface TestResult {
  index: number
  description: string
  status: string
  expected: string
  actual: string
  stderr: string
  error_type?: 'syntax' | 'runtime' | 'logic' | 'timeout'
}

export interface SubmitResult {
  submission_id: string
  status: string
  score: number
  stdout: string | null
  stderr: string | null
  execution_time?: number
  error_type?: string
  encouragement_message?: string
  xp_earned: number
  unlocked_achievements: Array<{ slug: string; name: string; rarity: string }>
  ai_analysis: string | null
  test_results: TestResult[]
  stars: number  // 0-5 quality tier
}

/** 获取课时详情 */
export async function getLesson(lessonId: number): Promise<LessonDetail> {
  const { data } = await apiClient.get<LessonDetail>(`/lessons/${lessonId}`)
  return data
}

/** 提交代码 */
export async function submitCode(lessonId: number, code: string): Promise<SubmitResult> {
  const { data } = await apiClient.post<SubmitResult>(`/lessons/${lessonId}/submit`, { code })
  return data
}

/** 获取提示 */
export async function getHint(lessonId: number): Promise<{ hint: string }> {
  const { data } = await apiClient.get<{ hint: string }>(`/lessons/${lessonId}/hint`)
  return data
}
