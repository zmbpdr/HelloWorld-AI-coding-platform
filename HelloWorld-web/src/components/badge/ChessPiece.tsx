/**
 * 象棋棋子组件 - ChessPiece
 * 功能：SVG 骑士棋子，用于闯关地图的棋子跳跃动画，
 * 支持主题色、尺寸、悬浮动画和跳跃动画模式。
 */
import { useEffect, useState } from 'react'

interface ChessPieceProps {
  color?: string
  size?: number
  animated?: boolean
  jumping?: boolean
  className?: string
}

export default function ChessPiece({ color = '#6366f1', size = 36, animated = true, jumping = false, className = '' }: ChessPieceProps) {
  const [bob, setBob] = useState(0)

  useEffect(() => {
    if (!animated) return
    // Subtle idle bob — gentle sine wave
    let frame: number
    const start = Date.now()
    const tick = () => {
      const t = (Date.now() - start) / 1000
      setBob(Math.sin(t * 1.8) * 2)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [animated])

  return (
    <div
      className={`select-none pointer-events-none ${className}`}
      style={{
        width: size,
        height: size,
        transform: jumping
          ? undefined // controlled by parent during jump
          : `translateY(${bob}px)`,
        transition: animated ? 'none' : undefined,
      }}
    >
      <svg viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        {/* Knight silhouette */}
        <g>
          {/* Body */}
          <path
            d="M20 2 C12 2 6 8 6 14 L5 16 C4 20 5 24 8 26 L8 36 C8 40 10 44 14 46 L26 46 C30 44 32 40 32 36 L32 26 C35 24 36 20 35 16 L34 14 C34 8 28 2 20 2Z"
            fill={color}
            opacity="0.9"
          />
          {/* Head highlight */}
          <path
            d="M14 10 C14 6 18 4 20 4 C22 4 26 6 26 10 L26 14 C26 16 24 18 20 18 C16 18 14 16 14 14Z"
            fill={color}
            style={{ filter: 'brightness(1.3)' }}
          />
          {/* Eye */}
          <circle cx="20" cy="12" r="1.5" fill="rgba(255,255,255,0.6)" />
          {/* Base */}
          <path
            d="M12 44 L12 46 C14 47 17 48 20 48 C23 48 26 47 28 46 L28 44Z"
            fill={color}
            style={{ filter: 'brightness(0.7)' }}
          />
          {/* Outline for definition */}
          <path
            d="M20 2 C12 2 6 8 6 14 L5 16 C4 20 5 24 8 26 L8 36 C8 40 10 44 14 46 L26 46 C30 44 32 40 32 36 L32 26 C35 24 36 20 35 16 L34 14 C34 8 28 2 20 2Z"
            stroke={color}
            strokeWidth="0.8"
            fill="none"
            style={{ filter: 'brightness(1.5)' }}
            opacity="0.5"
          />
        </g>
      </svg>
      {/* Shadow */}
      <div
        style={{
          position: 'absolute',
          bottom: -4,
          left: '15%',
          width: '70%',
          height: 3,
          borderRadius: '50%',
          background: `${color}20`,
          transform: `scaleX(${jumping ? 0.5 : 1})`,
          transition: 'transform 0.3s ease',
        }}
      />
    </div>
  )
}
