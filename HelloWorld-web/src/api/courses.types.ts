/**
 * 课程模块类型定义
 * 包含语言列表、课时信息和语言详情的数据结构
 */

/** 语言列表响应 */
export interface LanguageResponse {
  id: number
  slug: string
  name: string
  description: string | null
  icon_url: string | null
  color: string | null
  difficulty: string | null
  total_lessons: number
  completed_lessons: number
  progress_percent: number
}

/** 课时简要信息 */
export interface LessonBrief {
  id: number
  title: string
  slug: string
  difficulty: string | null
  order: number
  xp_reward: number
  status: string | null
  best_score: number
}

/** 语言详情 */
export interface LanguageDetail {
  id: number
  slug: string
  name: string
  description: string | null
  icon_url: string | null
  color: string | null
  difficulty: string | null
  lessons: LessonBrief[]
}
