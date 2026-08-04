/**
 * 成就解锁提示组件 - AchievementToast
 * 功能：当用户解锁新成就时，在页面右上角弹出动画提示，
 * 显示成就名称和稀有度，自动消失。
 */
import { useEffect, useRef, useState } from 'react'

interface AchievementToastProps { achievement: { slug: string; name: string; rarity: string } | null; onClose: () => void }

const rarityColors: Record<string, string> = { common: '#e2e8f0', rare: '#a7f3d0', epic: '#c4b5fd', legendary: '#fde68a' }
const rarityLabels: Record<string, string> = { common: '普通', rare: '稀有', epic: '史诗', legendary: '传说' }

export default function AchievementToast({ achievement, onClose }: AchievementToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const outerTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const innerTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const onCloseRef = useRef(onClose); onCloseRef.current = onClose

  useEffect(() => {
    if (!achievement) return
    let notifyEnabled = true
    try { const stored = localStorage.getItem('helloworld_achievement_notify'); if (stored !== null) { const v = JSON.parse(stored); notifyEnabled = typeof v === 'boolean' ? v : true } } catch { /* default on */ }
    if (!notifyEnabled) { onCloseRef.current(); return }
    setIsVisible(true)
    outerTimerRef.current = setTimeout(() => { setIsVisible(false); innerTimerRef.current = setTimeout(() => onCloseRef.current(), 300) }, 3500)
    return () => { clearTimeout(outerTimerRef.current); clearTimeout(innerTimerRef.current) }
  }, [achievement])

  if (!achievement) return null
  const borderColor = rarityColors[achievement.rarity] || rarityColors.common

  return (
    <div className={`fixed top-6 right-6 z-[100] transition-all duration-400 ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
      <div className="rounded-2xl p-4 shadow-lg min-w-[300px]" style={{ background: '#ffffff', border: `2px solid ${borderColor}`, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div className="flex items-center gap-4">
          <div className="text-4xl">🏆</div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold"
                style={{ background: `${borderColor}40`, color: '#1e293b' }}>{rarityLabels[achievement.rarity] || achievement.rarity}</span>
              <span className="text-xs" style={{ color: '#64748b' }}>成就解锁!</span>
            </div>
            <p className="font-bold text-lg" style={{ color: '#1e293b' }}>{achievement.name}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
