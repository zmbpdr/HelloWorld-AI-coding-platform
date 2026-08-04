/**
 * 学习活跃度热力图组件 - ActivityHeatmap
 * 功能：展示过去 90 天的学习活跃度，以颜色深浅表示每天
 * 的代码提交次数，类似 GitHub 贡献热力图。
 */
import { useEffect, useState } from 'react'
import apiClient from '../../api/client'

interface DayActivity { date: string; count: number }

export default function ActivityHeatmap() {
  const [activity, setActivity] = useState<DayActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { apiClient.get('/users/me/activity').then(r => setActivity(r.data.activity || [])).catch(() => {}).finally(() => setLoading(false)) }, [])

  if (loading) return <div className="h-4 w-full skeleton-shimmer rounded" />

  const maxCount = Math.max(...activity.map(d => d.count), 1)
  const getColor = (count: number) => {
    if (count === 0) return '#f0f2ed'
    const intensity = count / maxCount
    if (intensity < 0.25) return '#a7f3d0'; if (intensity < 0.5) return '#6ee7b7'; if (intensity < 0.75) return '#34d399'; return '#10b981'
  }

  const weeks: DayActivity[][] = []
  for (let i = 0; i < activity.length; i += 7) weeks.push(activity.slice(i, i + 7))

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span style={{ color: '#64748b', fontSize: 12 }}>学习活跃度</span>
        <span style={{ color: '#94a3b8', fontSize: 11 }}>{activity.filter(d => d.count > 0).length} 天活跃 / 90 天</span>
      </div>
      <div className="flex gap-0.5" style={{ overflowX: 'auto' }}>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((day) => <div key={day.date} className="rounded-sm" style={{ width: 11, height: 11, background: getColor(day.count) }} title={`${day.date}: ${day.count} 次提交`} />)}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-1.5" style={{ fontSize: 10, color: '#94a3b8' }}>
        <span>少</span>
        {[0, 0.25, 0.5, 0.75, 1].map(v => <div key={v} className="rounded-sm" style={{ width: 10, height: 10, background: getColor(v * maxCount) }} />)}
        <span>多</span>
      </div>
    </div>
  )
}
