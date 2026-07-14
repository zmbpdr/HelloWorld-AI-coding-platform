import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '../stores/userStore'
import { getMyStats, getMyAchievements } from '../api/user'
import Button from '../components/ui/Button'
import AchievementCard from '../components/badge/AchievementCard'
import PageTransition from '../components/ui/PageTransition'
import ActivityHeatmap from '../components/ui/ActivityHeatmap'

interface Stats {
  username: string
  level: number
  xp: number
  streak_days: number
  completed_lessons: number
  total_submissions: number
  first_pass_count: number
}

interface AchievementData {
  id: number
  slug: string
  name: string
  description: string | null
  rarity: string
  unlocked: boolean
  unlocked_at: string | null
}

export default function Profile() {
  const navigate = useNavigate()
  const { logout, isAuthenticated } = useUserStore()
  const [stats, setStats] = useState<Stats | null>(null)
  const [achievements, setAchievements] = useState<AchievementData[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!isAuthenticated) { navigate('/'); return }
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const [sRes, aRes] = await Promise.all([
          getMyStats().catch(() => null),
          getMyAchievements().catch(() => ({ data: [] })),
        ])
        if (cancelled) return
        if (sRes) setStats(sRes.data || sRes)
        setAchievements(aRes?.data ?? aRes ?? [])
      } catch {
        if (!cancelled) setLoadError('加载数据失败')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [isAuthenticated, navigate])

  const handleLogout = () => { logout(); navigate('/') }

  if (loading) return <ProfileSkeleton />

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#080c17' }}>
        <p className="text-5xl">⚠️</p>
        <p style={{ color: '#94a3b8' }}>{loadError}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg text-white text-sm"
          style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>重试</button>
      </div>
    )
  }

  const unlockedCount = achievements.length
  const level = stats?.level ?? 1
  const xpInLevel = stats ? stats.xp % 100 : 0
  const hasActivity = stats && (stats.completed_lessons > 0 || stats.total_submissions > 0)

  return (
    <PageTransition>
      <div className="min-h-screen mesh-bg" style={{ background: '#080c17' }}>
        <nav
          className="sticky top-0 z-40 border-b border-white/[0.04] nav-glow"
          style={{ background: 'rgba(8,12,23,0.85)', backdropFilter: 'blur(24px)' }}
        >
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#f1f5f9' }}>CodeQuest</h1>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate('/')}>返回大厅</Button>
              <Button variant="ghost" onClick={() => navigate('/settings')}>设置</Button>
              <Button variant="ghost" onClick={() => navigate('/pricing')}>会员方案</Button>
            </div>
          </div>
        </nav>

        <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
          {/* 用户信息卡片 */}
          <div className="rounded-2xl p-6" style={{ background: 'rgba(15,19,34,0.7)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
            <div className="flex items-center gap-6">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  boxShadow: '0 0 20px rgba(99,102,241,0.4)',
                  border: '3px solid rgba(99,102,241,0.5)',
                }}
              >
                {stats?.username?.charAt(0).toUpperCase() || 'U'}
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold truncate" style={{ color: '#f1f5f9' }}>
                  {stats?.username || '用户'}
                </h2>

                <div className="mt-2">
                  <div className="flex items-center gap-2 text-sm" style={{ color: '#94a3b8' }}>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>
                      Lv.{level}
                    </span>
                    <span className="tabular-nums">{stats?.xp || 0} XP</span>
                  </div>
                  <div className="mt-2 h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${xpInLevel}%`,
                        background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                      }}
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color: '#475569' }}>
                    距离下一级还需 {100 - xpInLevel} XP
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                {hasActivity && (
                  <Button onClick={() => navigate('/')}>继续学习</Button>
                )}
                <Button variant="secondary" onClick={handleLogout}>退出登录</Button>
              </div>
            </div>
          </div>

          {/* 统计数据 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="完成课时" value={stats?.completed_lessons || 0} icon="📎" index={0} />
            <StatCard label="代码提交" value={stats?.total_submissions || 0} icon="🔇" index={1} />
            <StatCard label="一次通过" value={stats?.first_pass_count || 0} icon="🦆" index={2} />
            <StatCard label="连续打卡" value={stats?.streak_days || 0} icon="🔥" suffix="天" index={3} />
          </div>

          {/* 学习热力图 */}
          <div className="p-5 rounded-2xl" style={{ background: 'rgba(15,19,34,0.65)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <ActivityHeatmap />
          </div>

          {/* 成就展示 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>成就</h3>
              <span className="text-sm" style={{ color: '#94a3b8' }}>
                已解锁 <span className="font-semibold" style={{ color: '#f59e0b' }}>{unlockedCount}</span> / {achievements.length}
              </span>
            </div>
            {achievements.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {achievements.map((ach) => (
                  <AchievementCard key={ach.id} achievement={ach} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 rounded-2xl border border-white/[0.04]" style={{ background: 'rgba(15,19,34,0.6)' }}>
                <p className="text-4xl mb-3">🏆</p>
                <p style={{ color: '#94a3b8' }}>完成课时和挑战来解锁成就</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  )
}

const statAccentColors = ['#6366f1', '#06b6d4', '#22c55e', '#f59e0b']
function StatCard({ label, value, icon, suffix, index = 0 }: { label: string; value: number; icon: string; suffix?: string; index?: number }) {
  const isEmpty = value === 0
  const accentColor = statAccentColors[index % statAccentColors.length]
  return (
    <div className="rounded-xl p-4 text-center transition-all duration-300 hover:-translate-y-1" style={{ background: 'rgba(15,19,34,0.7)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: `0 2px 12px rgba(0,0,0,0.1), inset 0 1px 0 ${accentColor}15` }}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold tabular-nums" style={{ color: isEmpty ? '#334155' : '#f1f5f9' }}>
        {value}{suffix && value > 0 ? suffix : ''}
      </div>
      <div className="text-xs mt-1" style={{ color: '#475569' }}>{label}</div>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="animate-pulse min-h-screen" style={{ background: '#080c17' }}>
      <nav className="border-b border-white/[0.04]" style={{ background: 'rgba(8,12,23,0.85)' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="h-8 w-32 rounded skeleton-shimmer" />
          <div className="flex gap-3">
            <div className="h-9 w-20 rounded-lg skeleton-shimmer" />
            <div className="h-9 w-16 rounded-lg skeleton-shimmer" />
          </div>
        </div>
      </nav>
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <div className="rounded-2xl p-6" style={{ background: 'rgba(15,19,34,0.8)', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full skeleton-shimmer" />
            <div className="flex-1 space-y-3">
              <div className="h-7 w-32 rounded skeleton-shimmer" />
              <div className="h-4 w-24 rounded skeleton-shimmer" />
              <div className="h-2.5 rounded-full skeleton-shimmer" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl p-4" style={{ background: 'rgba(15,19,34,0.8)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="h-8 w-8 rounded mx-auto mb-2 skeleton-shimmer" />
              <div className="h-6 w-12 rounded mx-auto mb-1 skeleton-shimmer" />
              <div className="h-3 w-16 rounded mx-auto skeleton-shimmer" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
