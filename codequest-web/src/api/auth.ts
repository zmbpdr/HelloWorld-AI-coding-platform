import apiClient from './client'
import type { RegisterParams, LoginParams, AuthResponse, UserResponse } from './auth.types'

/** 用户注册 */
export async function register(params: RegisterParams): Promise<UserResponse> {
  const { data } = await apiClient.post<UserResponse>('/auth/register', params)
  return data
}

/** 用户登录 */
export async function login(params: LoginParams): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', params)
  return data
}

/** 刷新令牌 */
export async function refreshToken(token: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/refresh', {
    refresh_token: token,
  })
  return data
}

/** 获取当前用户信息 */
export async function getCurrentUser(): Promise<UserResponse> {
  const { data } = await apiClient.get<UserResponse>('/users/me')
  return data
}
