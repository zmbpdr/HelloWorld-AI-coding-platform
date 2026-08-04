/**
 * 认证守卫组件 - RequireAuth
 * 功能：路由守卫，检查用户是否已认证。
 * 未登录时自动重定向到首页，保护需要登录才能访问的页面。
 */
import { Navigate } from 'react-router-dom'
import { useUserStore } from '../../stores/userStore'

interface RequireAuthProps {
  children: React.ReactNode
}

/** 认证守卫组件 */
export default function RequireAuth({ children }: RequireAuthProps) {
  const isAuthenticated = useUserStore((s) => s.isAuthenticated)

  // 未登录时重定向到首页
  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
