/**
 * adminStore.ts - 管理后台 Zustand 状态管理
 *
 * 管理管理员认证状态，包含登录、获取管理员信息、退出登录、
 * 清除错误等操作，使用 localStorage 持久化 token。
 */

import { create } from 'zustand'
import { adminLogin, getAdminInfo } from '../api/admin'

/** 管理员用户信息 */
interface AdminUser {
  id: number
  username: string
  email: string | null
  role: string
  is_active: boolean
}

/** 管理员状态管理接口 */
interface AdminState {
  admin: AdminUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<void>
  fetchAdmin: () => Promise<void>
  logout: () => void
  clearError: () => void
}

/** 管理员认证状态管理 Store */
export const useAdminStore = create<AdminState>((set) => ({
  admin: null,
  // 初始化时检查 localStorage 是否有 token 来判断是否已认证
  isAuthenticated: !!localStorage.getItem('admin_token'),
  isLoading: false,
  error: null,

  /**
   * 登录 — 先调用登录接口获取 token，再获取管理员信息
   * 这样避免竞态导致 UI 不一致
   */
  login: async (username, password) => {
    set({ isLoading: true, error: null })
    try {
      const response = await adminLogin(username, password)
      localStorage.setItem('admin_token', response.access_token)
      const adminInfo = await getAdminInfo()
      set({ admin: adminInfo, isAuthenticated: true, isLoading: false })
    } catch (err: unknown) {
      localStorage.removeItem('admin_token')
      const message = err instanceof Error ? err.message : '登录失败'
      set({ error: message, isLoading: false })
      throw err
    }
  },

  /** 获取当前管理员信息 */
  fetchAdmin: async () => {
    try {
      const adminInfo = await getAdminInfo()
      set({ admin: adminInfo, isAuthenticated: true })
    } catch {
      // 获取失败视为未登录，清除状态
      set({ admin: null, isAuthenticated: false })
      localStorage.removeItem('admin_token')
    }
  },

  /** 退出登录 — 清除 token 和状态 */
  logout: () => {
    localStorage.removeItem('admin_token')
    set({ admin: null, isAuthenticated: false })
  },

  /** 清除错误信息 */
  clearError: () => set({ error: null }),
}))
