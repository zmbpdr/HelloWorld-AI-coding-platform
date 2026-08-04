/**
 * 认证模块类型定义
 * 包含注册/登录参数、认证响应和用户信息的数据结构
 */

/** 注册参数 */
export interface RegisterParams {
  username: string
  email?: string
  password: string
}

/** 登录参数 */
export interface LoginParams {
  username: string
  password: string
}

/** 认证响应 */
export interface AuthResponse {
  access_token: string
  token_type: string
}

/** 用户信息响应 */
export interface UserResponse {
  id: number
  username: string
  email: string | null
  avatar: string | null
  bio: string | null
  level: number
  xp: number
  streak_days: number
  created_at: string
}
