/**
 * 页面过渡动画组件 - PageTransition
 * 功能：包裹页面内容，提供进入动画效果（淡入+上移）
 */
import type { ReactNode } from 'react'

/** 页面过渡动画组件 */
export default function PageTransition({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>
}
