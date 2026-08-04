/**
 * 连击计数 Hook - useComboStreak
 * 管理用户连续成功提交的连击次数，记录最佳连击数，
 * 数据持久化到 localStorage。
 */
import { useState, useCallback } from 'react'

export interface StreakState {
  count: number
  best: number
}

/** 连击计数 Hook */
export function useComboStreak() {
  const [streak, setStreak] = useState<StreakState>(() => {
    try {
      const stored = localStorage.getItem('helloworld_streak')
      return stored ? JSON.parse(stored) : { count: 0, best: 0 }
    } catch {
      return { count: 0, best: 0 }
    }
  })

  const recordSuccess = useCallback(() => {
    setStreak(prev => {
      const next = { count: prev.count + 1, best: Math.max(prev.best, prev.count + 1) }
      localStorage.setItem('helloworld_streak', JSON.stringify(next))
      return next
    })
  }, [])

  const recordFailure = useCallback(() => {
    setStreak(prev => {
      const next = { count: 0, best: prev.best }
      localStorage.setItem('helloworld_streak', JSON.stringify(next))
      return next
    })
  }, [])

  return { streak, recordSuccess, recordFailure }
}

/** 连击指示器组件，连击数 >=2 时显示 */
export function StreakIndicator({ count, best }: { count: number; best: number }) {
  if (count < 2) return null
  return (
    <span className="text-xs font-mono" style={{ color: '#f59e0b' }}>
      🔥 {count} 连击 · 最佳 {best}
    </span>
  )
}
