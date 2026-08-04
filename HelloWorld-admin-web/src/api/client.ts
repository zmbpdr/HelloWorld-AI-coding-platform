/**
 * client.ts - Axios 实例配置
 *
 * 创建 Axios 实例，配置基础路径和超时时间。
 * 请求拦截器自动添加 JWT token，响应拦截器处理 401 未授权场景。
 */

import axios from 'axios'

/** axios 实例，基础路径指向 /api/v1/admin */
const apiClient = axios.create({
  baseURL: '/api/v1/admin',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

/**
 * 请求拦截器 - 从 localStorage 读取 admin_token 并自动添加到请求头
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

/**
 * 响应拦截器 - 401 未授权时清除 token、触发登出事件、跳转到登录页
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token')
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
      const { useAdminStore } = await import('../stores/adminStore')
      useAdminStore.getState().logout()
    }
    return Promise.reject(error)
  }
)

export default apiClient
