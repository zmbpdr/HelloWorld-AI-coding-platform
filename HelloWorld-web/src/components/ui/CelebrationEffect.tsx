/**
 * 庆祝特效组件 - CelebrationEffect
 * 功能：高分通关时的五彩纸屑粒子动画特效，
 * 展示 Canvas 粒子爆发效果和 XP 得分面板。
 */
import { useEffect, useRef } from 'react'

interface CelebrationEffectProps {
  active: boolean
  onComplete?: () => void
  xpEarned?: number
  xpTotal?: number
}

/** 粒子数据结构 */
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
  size: number
  type: 'circle' | 'star' | 'square'
  rotation: number
  rotationSpeed: number
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, innerR: number, outerR: number, points: number) {
  ctx.beginPath()
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerR : innerR
    const angle = (i * Math.PI) / points - Math.PI / 2
    const x = cx + Math.cos(angle) * radius
    const y = cy + Math.sin(angle) * radius
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
}

export default function CelebrationEffect({ active, onComplete, xpEarned, xpTotal }: CelebrationEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (!active || !canvasRef.current) return

    // 检查成就通知设置
    let notifyEnabled = true
    try {
      const stored = localStorage.getItem('helloworld_achievement_notify')
      if (stored !== null) { const v = JSON.parse(stored); notifyEnabled = typeof v === 'boolean' ? v : true }
    } catch { /* default enabled */ }
    if (!notifyEnabled) {
      onCompleteRef.current?.()
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles: Particle[] = []
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']
    const types: Particle['type'][] = ['circle', 'circle', 'circle', 'star', 'square']

    const createBurst = (x: number, y: number) => {
      for (let i = 0; i < 80; i++) {
        const angle = (Math.PI * 2 * i) / 80 + Math.random() * 0.2
        const speed = 3 + Math.random() * 5
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 2 + Math.random() * 5,
          type: types[Math.floor(Math.random() * types.length)],
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.1,
        })
      }
    }

    // 即时爆发（多个位置）
    createBurst(canvas.width * 0.2, canvas.height * 0.35)
    createBurst(canvas.width * 0.5, canvas.height * 0.25)
    createBurst(canvas.width * 0.8, canvas.height * 0.35)
    createBurst(canvas.width * 0.35, canvas.height * 0.55)
    createBurst(canvas.width * 0.65, canvas.height * 0.5)

    // 延迟爆发
    timersRef.current.push(setTimeout(() => createBurst(canvas.width * 0.3, canvas.height * 0.7), 200))
    timersRef.current.push(setTimeout(() => createBurst(canvas.width * 0.7, canvas.height * 0.65), 400))
    timersRef.current.push(setTimeout(() => createBurst(canvas.width * 0.5, canvas.height * 0.5), 600))

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.05
        p.life -= 0.01

        if (p.life <= 0) {
          particles.splice(i, 1)
          continue
        }

        ctx.globalAlpha = p.life
        ctx.fillStyle = p.color
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)

        if (p.type === 'circle') {
          ctx.beginPath()
          ctx.arc(0, 0, p.size * p.life, 0, Math.PI * 2)
          ctx.fill()
        } else if (p.type === 'star') {
          drawStar(ctx, 0, 0, p.size * p.life * 0.5, p.size * p.life, 5)
        } else {
          const s = p.size * p.life * 1.2
          ctx.fillRect(-s / 2, -s / 2, s, s)
        }

        ctx.restore()
        p.rotation += p.rotationSpeed
      }

      if (particles.length > 0) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        onCompleteRef.current?.()
      }
    }

    animate()

    return () => {
      cancelAnimationFrame(animationRef.current)
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
    }
  }, [active])

  if (!active) return null

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-[200] pointer-events-none"
      />
      {xpEarned && xpEarned > 0 ? (
        <div className="fixed inset-0 z-[201] pointer-events-none flex items-center justify-center">
          <div className="bg-gray-900/95 border border-yellow-500/40 rounded-2xl px-8 py-6 text-center">
            <p className="text-4xl mb-2">🎉</p>
            <p className="text-yellow-400 text-2xl font-bold">+{xpEarned} XP</p>
            {xpTotal !== undefined && (
              <div className="mt-3 w-48 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, (xpTotal % 100))}%` }}
                />
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
