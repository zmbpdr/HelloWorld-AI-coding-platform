import { useState, useCallback } from 'react'

export interface StreakState {
  count: number
  best: number
}

export function useComboStreak() {
  const [streak, setStreak] = useState<StreakState>(() => {
    try {
      const stored = localStorage.getItem('codequest_streak')
      return stored ? JSON.parse(stored) : { count: 0, best: 0 }
    } catch {
      return { count: 0, best: 0 }
    }
  })

  const recordSuccess = useCallback(() => {
    setStreak(prev => {
      const next = { count: prev.count + 1, best: Math.max(prev.best, prev.count + 1) }
      localStorage.setItem('codequest_streak', JSON.stringify(next))
      return next
    })
  }, [])

  const recordFailure = useCallback(() => {
    setStreak(prev => {
      const next = { count: 0, best: prev.best }
      localStorage.setItem('codequest_streak', JSON.stringify(next))
      return next
    })
  }, [])

  return { streak, recordSuccess, recordFailure }
}

export function StreakIndicator({ count, best }: { count: number; best: number }) {
  if (count < 2) return null
  return (
    <span className="text-xs font-mono" style={{ color: '#f59e0b' }}>
      🔥 {count} 连击 · 最佳 {best}
    </span>
  )
}
