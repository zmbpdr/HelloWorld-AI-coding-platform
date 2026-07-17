import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../api/client'
import PageTransition from '../components/ui/PageTransition'

interface LeaderEntry {
  rank: number; username: string; avatar: string | null; xp: number; level: number; completed_lessons: number; streak_days: number
}

const PERIODS = [{ key: 'all', label: '总榜' }, { key: 'month', label: '月榜' }, { key: 'week', label: '周榜' }]
const MEDAL_COLORS: Record<number, string> = { 1: '#d97706', 2: '#64748b', 3: '#b45309' }

export default function Leaderboard() {
  const navigate = useNavigate()
  const [data, setData] = useState<LeaderEntry[]>([])
  const [period, setPeriod] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    apiClient.get(`/leaderboard?period=${period}&limit=30`)
      .then(r => setData(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period])

  return (
    <PageTransition>
      <div className="min-h-screen" style={{ background: '#fafbf8' }}>
        <nav className="sticky top-0 z-40 nav-glow" style={{ background: 'rgba(250,251,248,0.85)', backdropFilter: 'blur(24px)', borderBottom: '1px solid #e6e8e3' }}>
          <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
            <button onClick={() => navigate('/')} className="text-sm font-medium transition-colors" style={{ color: '#64748b' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#1e293b' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#64748b' }}>← 返回大厅</button>
            <h1 className="text-xl font-bold" style={{ color: '#1e293b' }}>🏆 排行榜</h1>
          </div>
        </nav>

        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="flex gap-2 mb-6">
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)} className="px-5 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: period === p.key ? 'linear-gradient(135deg, #10b981, #059669)' : '#ffffff',
                  color: period === p.key ? '#fff' : '#64748b',
                  border: period === p.key ? 'none' : '1px solid #e6e8e3',
                }}>{p.label}</button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 rounded-xl skeleton-shimmer" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {data.map((entry) => (
                <div key={entry.username} className="flex items-center gap-4 p-4 rounded-2xl transition-all hover:translate-x-1"
                  style={{
                    background: entry.rank <= 3 ? '#fffbeb' : '#ffffff',
                    border: entry.rank <= 3 ? `1px solid ${MEDAL_COLORS[entry.rank] || '#e6e8e3'}40` : '1px solid #e6e8e3',
                    boxShadow: entry.rank <= 3 ? `0 2px 8px ${MEDAL_COLORS[entry.rank] || '#10b981'}08` : '0 1px 2px rgba(0,0,0,0.03)',
                  }}>
                  <div className="w-10 text-center font-bold text-lg" style={{ color: MEDAL_COLORS[entry.rank] || '#94a3b8' }}>
                    {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate" style={{ color: '#1e293b' }}>{entry.username}</div>
                    <div className="text-xs" style={{ color: '#94a3b8' }}>Lv.{entry.level} · 完成 {entry.completed_lessons} 关 · 🔥 {entry.streak_days} 天</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold" style={{ color: '#d97706' }}>{entry.xp.toLocaleString()}</div>
                    <div className="text-[10px]" style={{ color: '#94a3b8' }}>XP</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
