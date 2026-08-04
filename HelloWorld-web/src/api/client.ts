/**
 * Axios HTTP 客户端
 * 功能：创建带基础路径和默认配置的 Axios 实例，
 * 配置请求拦截器自动添加 JWT token，
 * 配置响应拦截器处理 401 认证失效自动退出登录。
 */
import axios from 'axios'

/** Axios 请求实例，基础路径为 /api/v1 */
const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器 - 自动添加 JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器 - 处理 401 自动跳转登录
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      // 通过 zustand store 更新状态，触发 RequireAuth 重定向
      import('../stores/userStore').then(({ useUserStore }) => {
        useUserStore.getState().logout()
      })
    }
    return Promise.reject(error)
  }
)

export default apiClient
