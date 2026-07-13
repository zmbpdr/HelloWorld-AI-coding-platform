import { useEffect, useState } from 'react'
import apiClient from '../../api/client'

interface StatPoint {
  attempt: number
  score: number
  execution_time: number
  status: string
}

interface LessonStats {
  total_attempts: number
  best_score: number
  avg_time: number
  timeline: StatPoint[]
  error_counts: Record<string, number>
}

export default function LessonStats({ lessonId }: { lessonId: number }) {
  const [stats, setStats] = useState<LessonStats | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open || stats) return
    apiClient.get(`/lessons/${lessonId}/stats`).then(r => setStats(r.data)).catch(() => {})
  }, [lessonId, open])

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-2 py-1 rounded-lg transition-colors"
        style={{ color: '#94a3b8', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        onMouseEnter={e => { e.currentTarget.style.color = '#cbd5e1' }}
        onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8' }}
      >
        📊 统计
      </button>
    )
  }

  if (!stats || stats.total_attempts === 0) {
    return (
      <div className="text-xs" style={{ color: '#64748b' }}>
        <button onClick={() => setOpen(false)} className="mr-2" style={{ color: '#94a3b8' }}>✕</button>
        暂无提交记录
      </div>
    )
  }

  const maxTime = Math.max(...stats.timeline.map(t => t.execution_time), 10)
  const chartW = 200; const chartH = 60; const pad = 2

  return (
    <div className="text-xs" style={{ color: '#cbd5e1' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">📊 评测统计</span>
        <button onClick={() => setOpen(false)} style={{ color: '#64748b' }}>✕</button>
      </div>

      <div className="flex gap-4 mb-3">
        <span>提交 <b style={{ color: '#f1f5f9' }}>{stats.total_attempts}</b> 次</span>
        <span>最佳 <b style={{ color: '#22c55e' }}>{stats.best_score}</b> 分</span>
        <span>平均 <b style={{ color: '#60a5fa' }}>{stats.avg_time}ms</b></span>
      </div>

      {/* 执行时间趋势 */}
      <div className="mb-2">
        <span style={{ color: '#94a3b8' }}>执行时间趋势</span>
        <svg width={chartW} height={chartH} className="block mt-1" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 6 }}>
          {stats.timeline.map((p, i) => {
            const x = pad + (i / Math.max(stats.timeline.length - 1, 1)) * (chartW - pad * 2)
            const y = chartH - pad - (p.execution_time / maxTime) * (chartH - pad * 2)
            return <circle key={i} cx={x} cy={y} r={3} fill={p.status === 'accepted' ? '#22c55e' : '#f59e0b'} />
          })}
        </svg>
      </div>

      {/* 错误类型分布 */}
      <div>
        <span style={{ color: '#94a3b8' }}>错误类型</span>
        <div className="flex gap-3 mt-1">
          {Object.entries(stats.error_counts).map(([type, count]) => (
            <div key={type} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{
                background: type === 'syntax' ? '#ef4444' : type === 'runtime' ? '#f97316' : type === 'timeout' ? '#f59e0b' : '#3b82f6'
              }} />
              <span style={{ color: '#94a3b8', fontSize: 11 }}>
                {{syntax:'语法',runtime:'运行',timeout:'超时',logic:'逻辑'}[type]}: {count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
