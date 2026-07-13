import { useEffect, useState } from 'react'
import apiClient from '../../api/client'

interface DayActivity {
  date: string
  count: number
}

export default function ActivityHeatmap() {
  const [activity, setActivity] = useState<DayActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/users/me/activity')
      .then(r => setActivity(r.data.activity || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="h-4 w-full skeleton-shimmer rounded" />

  const maxCount = Math.max(...activity.map(d => d.count), 1)

  const getColor = (count: number) => {
    if (count === 0) return 'rgba(255,255,255,0.03)'
    const intensity = count / maxCount
    if (intensity < 0.25) return 'rgba(34,197,94,0.15)'
    if (intensity < 0.5) return 'rgba(34,197,94,0.3)'
    if (intensity < 0.75) return 'rgba(34,197,94,0.5)'
    return 'rgba(34,197,94,0.75)'
  }

  // Group by week for GitHub-style layout
  const weeks: DayActivity[][] = []
  for (let i = 0; i < activity.length; i += 7) {
    weeks.push(activity.slice(i, i + 7))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span style={{ color: '#94a3b8', fontSize: 12 }}>学习活跃度</span>
        <span style={{ color: '#475569', fontSize: 11 }}>
          {activity.filter(d => d.count > 0).length} 天活跃 / 90 天
        </span>
      </div>
      <div className="flex gap-0.5" style={{ overflowX: 'auto' }}>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((day) => (
              <div
                key={day.date}
                className="rounded-sm"
                style={{ width: 11, height: 11, background: getColor(day.count) }}
                title={`${day.date}: ${day.count} 次提交`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-1.5" style={{ fontSize: 10, color: '#475569' }}>
        <span>少</span>
        {[0, 0.25, 0.5, 0.75, 1].map(v => (
          <div key={v} className="rounded-sm" style={{ width: 10, height: 10, background: getColor(v * maxCount) }} />
        ))}
        <span>多</span>
      </div>
    </div>
  )
}
