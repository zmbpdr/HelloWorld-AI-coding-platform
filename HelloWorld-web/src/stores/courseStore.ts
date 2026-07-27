import { create } from 'zustand'
import { getLanguages, getLanguageMap } from '../api/courses'
import type { LanguageResponse, LanguageDetail } from '../api/courses.types'

interface CourseState {
  languages: LanguageResponse[]
  currentLanguage: LanguageDetail | null
  isLoading: boolean
  error: string | null

  /** 加载语言列表 */
  fetchLanguages: () => Promise<void>
  /** 加载语言闯关地图 */
  fetchLanguageMap: (slug: string) => Promise<void>
  /** 清除当前语言 */
  clearCurrentLanguage: () => void
}

export const useCourseStore = create<CourseState>((set) => ({
  languages: [],
  currentLanguage: null,
  isLoading: false,
  error: null,

  fetchLanguages: async () => {
    set({ isLoading: true, error: null })
    try {
      const languages = await getLanguages()
      set({ languages, isLoading: false })
    } catch {
      set({ error: '加载语言列表失败', isLoading: false })
    }
  },

  fetchLanguageMap: async (slug) => {
    set({ isLoading: true, error: null })
    try {
      const language = await getLanguageMap(slug)
      set({ currentLanguage: language, isLoading: false })
    } catch {
      set({ error: '加载课程地图失败', isLoading: false })
    }
  },

  clearCurrentLanguage: () => set({ currentLanguage: null }),
}))
