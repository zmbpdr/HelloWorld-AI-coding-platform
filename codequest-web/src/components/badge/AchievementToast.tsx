import { useEffect, useRef, useState } from 'react'

interface AchievementToastProps {
  achievement: {
    slug: string
    name: string
    rarity: string
  } | null
  onClose: () => void
}

const rarityColors: Record<string, string> = {
  common: 'rgba(255,255,255,0.1)',
  rare: 'rgba(99,102,241,0.4)',
  epic: 'rgba(139,92,246,0.4)',
  legendary: 'rgba(245,158,11,0.5)',
}

const rarityLabels: Record<string, string> = {
  common: '普通', rare: '稀有', epic: '史诗', legendary: '传说',
}

export default function AchievementToast({ achievement, onClose }: AchievementToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const outerTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const innerTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!achievement) return
    let notifyEnabled = true
    try {
      const stored = localStorage.getItem('codequest_achievement_notify')
      if (stored !== null) { const v = JSON.parse(stored); notifyEnabled = typeof v === 'boolean' ? v : true }
    } catch { /* default on */ }
    if (!notifyEnabled) { onCloseRef.current(); return }

    setIsVisible(true)
    outerTimerRef.current = setTimeout(() => {
      setIsVisible(false)
      innerTimerRef.current = setTimeout(() => onCloseRef.current(), 300)
    }, 3500)
    return () => {
      clearTimeout(outerTimerRef.current)
      clearTimeout(innerTimerRef.current)
    }
  }, [achievement])

  if (!achievement) return null

  const borderColor = rarityColors[achievement.rarity] || rarityColors.common

  return (
    <div
      className={`fixed top-6 right-6 z-[100] transition-all duration-400 ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
      }`}
    >
      <div
        className="rounded-2xl p-4 shadow-2xl min-w-[300px]"
        style={{
          background: 'rgba(15,19,34,0.95)',
          border: `2px solid ${borderColor}`,
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-4">
          <div className="text-4xl">🏆</div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold"
                style={{ background: rarityColors[achievement.rarity] || 'rgba(255,255,255,0.1)', color: '#f1f5f9' }}
              >
                {rarityLabels[achievement.rarity] || achievement.rarity}
              </span>
              <span className="text-xs" style={{ color: '#64748b' }}>成就解锁!</span>
            </div>
            <p className="font-bold text-lg" style={{ color: '#f1f5f9' }}>{achievement.name}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
