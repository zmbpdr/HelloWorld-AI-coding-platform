import { create } from 'zustand'
import { adminLogin, getAdminInfo } from '../api/admin'

// 管理员用户信息
interface AdminUser {
  id: number
  username: string
  email: string | null
  role: string
  is_active: boolean
}

// 管理员状态接口
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

// 管理员认证状态管理
export const useAdminStore = create<AdminState>((set) => ({
  admin: null,
  isAuthenticated: !!localStorage.getItem('admin_token'),
  isLoading: false,
  error: null,

  // 登录 — 先获取管理员信息再标记已认证，避免竞态导致 UI 不一致
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

  // 获取管理员信息
  fetchAdmin: async () => {
    try {
      const adminInfo = await getAdminInfo()
      set({ admin: adminInfo, isAuthenticated: true })
    } catch {
      set({ admin: null, isAuthenticated: false })
      localStorage.removeItem('admin_token')
    }
  },

  // 退出登录
  logout: () => {
    localStorage.removeItem('admin_token')
    set({ admin: null, isAuthenticated: false })
  },

  // 清除错误
  clearError: () => set({ error: null }),
}))
