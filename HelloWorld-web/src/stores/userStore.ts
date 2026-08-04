/**
 * 用户状态管理 Store
 * 基于 Zustand 管理用户认证状态、用户信息和登录/注册/登出等操作，
 * 支持从 localStorage 恢复会话、自动处理 token 过期。
 */
import { create } from 'zustand'
import axios from 'axios'
import { login as apiLogin, register as apiRegister, getCurrentUser } from '../api/auth'
import type { LoginParams, RegisterParams, UserResponse } from '../api/auth.types'

/** 从 API 错误中提取可读的错误信息 */
function extractError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail
    if (typeof detail === 'string') return detail
    // FastAPI 422 validation error returns array [{type, loc, msg, ...}]
    if (Array.isArray(detail)) {
      return detail.map((e: { msg?: string }) => e.msg || '').filter(Boolean).join('; ') || fallback
    }
    return err.message || fallback
  }
  if (err instanceof Error) {
    return err.message
  }
  return fallback
}

interface UserState {
  user: UserResponse | null
  token: string | null
  isAuthenticated: boolean
  isAuthResolved: boolean
  isLoading: boolean
  error: string | null

  initAuth: () => Promise<void>
  login: (params: LoginParams) => Promise<void>
  register: (params: RegisterParams) => Promise<void>
  logout: () => void
  clearError: () => void
  restoreSession: () => void
  fetchUser: () => Promise<void>
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isAuthResolved: false,
  isLoading: false,
  error: null,

  initAuth: async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      set({ isAuthResolved: true })
      return
    }
    set({ token, isLoading: true })
    try {
      const user = await getCurrentUser()
      set({ user, isAuthenticated: true, isAuthResolved: true, isLoading: false })
    } catch {
      localStorage.removeItem('access_token')
      set({ user: null, token: null, isAuthenticated: false, isAuthResolved: true, isLoading: false })
    }
  },

  login: async (params) => {
    set({ isLoading: true, error: null })
    localStorage.removeItem('diagnostic_completed')
    try {
      const authResponse = await apiLogin(params)
      localStorage.setItem('access_token', authResponse.access_token)
      set({ token: authResponse.access_token, isAuthenticated: true })
      try {
        const user = await getCurrentUser()
        set({ user, isAuthResolved: true, isLoading: false })
      } catch {
        localStorage.removeItem('access_token')
        set({ user: null, token: null, isAuthenticated: false, isAuthResolved: true, isLoading: false, error: '获取用户信息失败，请重试' })
      }
    } catch (err: unknown) {
      const message = extractError(err, '登录失败')
      set({ error: message, isAuthResolved: true, isLoading: false })
      throw err
    }
  },

  register: async (params) => {
    set({ isLoading: true, error: null })
    localStorage.removeItem('diagnostic_completed')
    try {
      await apiRegister(params)
      const authResponse = await apiLogin({ username: params.username, password: params.password })
      localStorage.setItem('access_token', authResponse.access_token)
      set({ token: authResponse.access_token, isAuthenticated: true })
      try {
        const user = await getCurrentUser()
        set({ user, isAuthResolved: true, isLoading: false })
      } catch {
        localStorage.removeItem('access_token')
        set({ user: null, token: null, isAuthenticated: false, isAuthResolved: true, isLoading: false, error: '获取用户信息失败，请重试' })
      }
    } catch (err: unknown) {
      const message = extractError(err, '注册失败')
      set({ error: message, isAuthResolved: true, isLoading: false })
      throw err
    }
  },

  fetchUser: async () => {
    try {
      const user = await getCurrentUser()
      set({ user })
    } catch {
      localStorage.removeItem('access_token')
      set({ user: null, token: null, isAuthenticated: false })
    }
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('diagnostic_completed')
    set({ user: null, token: null, isAuthenticated: false })
  },

  clearError: () => set({ error: null }),

  restoreSession: () => {
    const token = localStorage.getItem('access_token')
    if (token) {
      set({ token, isAuthenticated: true })
    }
  },
}))
