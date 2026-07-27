import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '../stores/userStore'
import { getMyStats, getMyAchievements } from '../api/user'
import apiClient from '../api/client'
import Button from '../components/ui/Button'
import AchievementCard from '../components/badge/AchievementCard'
import PageTransition from '../components/ui/PageTransition'
import ActivityHeatmap from '../components/ui/ActivityHeatmap'

interface Stats {
  username: string; level: number; xp: number; streak_days: number
  completed_lessons: number; total_submissions: number; first_pass_count: number
}
interface AchievementData {
  id: number; slug: string; name: string; description: string | null
  rarity: string; unlocked: boolean; unlocked_at: string | null
}

export default function Profile() {
  const navigate = useNavigate()
  const { logout, isAuthenticated } = useUserStore()
  const [stats, setStats] = useState<Stats | null>(null)
  const [achievements, setAchievements] = useState<AchievementData[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [knowledge, setKnowledge] = useState<{ tag: string; mastery: number }[]>([])
  const [aiAnalysis, setAiAnalysis] = useState('')
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false)
  const [weeklyReport, setWeeklyReport] = useState('')
  const [weeklyLoading, setWeeklyLoading] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) { navigate('/'); return }
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const [sRes, aRes, kRes] = await Promise.all([
          getMyStats().catch(() => null),
          getMyAchievements().catch(() => ({ data: [] })),
          apiClient.get('/progress/knowledge').catch(() => ({ data: { knowledge: [] } })),
        ])
        if (cancelled) return
        if (sRes) setStats(sRes.data || sRes)
        setAchievements(aRes?.data ?? aRes ?? [])
        setKnowledge(kRes?.data?.knowledge ?? [])
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#fafbf8' }}>
        <p className="text-5xl">⚠️</p>
        <p style={{ color: '#64748b' }}>{loadError}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-xl text-white text-sm font-medium"
          style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>重试</button>
      </div>
    )
  }

  const level = stats?.level ?? 1
  const xpInLevel = stats ? stats.xp % 100 : 0
  const hasActivity = stats && (stats.completed_lessons > 0 || stats.total_submissions > 0)

  const handleKnowledgeAnalysis = async () => {
    setAiAnalysisLoading(true)
    try {
      const payload = {
        code: '',
        lesson_id: undefined,
      }
      const summary = knowledge.map(k => `${k.tag}: ${k.mastery}%`).join('; ')
      const response = await apiClient.post('/ai/plan', {
        ...payload,
        code: `知识掌握情况：${summary}\n已完成课时：${stats?.completed_lessons || 0}\n总提交：${stats?.total_submissions || 0}`,
      }, { timeout: 120000 })
      setAiAnalysis(response.data.response || response.data.overall || '分析完成')
    } catch {
      setAiAnalysis('AI 分析失败，请稍后重试')
    } finally {
      setAiAnalysisLoading(false)
    }
  }

  const handleWeeklyReport = async () => {
    setWeeklyLoading(true)
    try {
      const res = await apiClient.get('/ai/weekly-report', { timeout: 120000 })
      setWeeklyReport(res.data?.report || '暂无周报数据')
    } catch {
      setWeeklyReport('周报生成失败，请稍后重试')
    } finally {
      setWeeklyLoading(false)
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen mesh-bg" style={{ background: '#fafbf8' }}>
        <nav
          className="sticky top-0 z-40 nav-glow"
          style={{ background: 'rgba(250,251,248,0.85)', backdropFilter: 'blur(24px)', borderBottom: '1px solid #e6e8e3' }}
        >
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1e293b' }}>Hello World</h1>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate('/')}>返回大厅</Button>
              <Button variant="ghost" onClick={() => navigate('/settings')}>设置</Button>
              <Button variant="ghost" onClick={() => navigate('/pricing')}>会员方案</Button>
              <Button variant="ghost" onClick={() => navigate('/errors')}>📝 错题本</Button>
            </div>
          </div>
        </nav>

        <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
          {/* 用户信息卡片 */}
          <div className="rounded-2xl p-6" style={{ background: '#ffffff', border: '1px solid #e6e8e3', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div className="flex items-center gap-6">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold shrink-0"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 0 24px rgba(16,185,129,0.2)', border: '3px solid rgba(16,185,129,0.3)' }}
              >
                {stats?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold truncate" style={{ color: '#1e293b' }}>{stats?.username || '用户'}</h2>
                <div className="mt-2">
                  <div className="flex items-center gap-2 text-sm" style={{ color: '#64748b' }}>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: '#ecfdf5', color: '#059669' }}>Lv.{level}</span>
                    <span className="tabular-nums">{stats?.xp || 0} XP</span>
                  </div>
                  <div className="mt-2 h-2.5 rounded-full overflow-hidden" style={{ background: '#f0f2ed' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${xpInLevel}%`, background: 'linear-gradient(90deg, #10b981, #34d399)' }} />
                  </div>
                  <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>距离下一级还需 {100 - xpInLevel} XP</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                {hasActivity && <Button onClick={() => navigate('/')}>继续学习</Button>}
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
          <div className="p-5 rounded-2xl" style={{ background: '#ffffff', border: '1px solid #e6e8e3', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <ActivityHeatmap />
          </div>

          {/* 知识掌握度 */}
          <div className="p-5 rounded-2xl" style={{ background: '#ffffff', border: '1px solid #e6e8e3', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">📊</span>
              <h3 className="text-lg font-bold" style={{ color: '#1e293b' }}>知识掌握度</h3>
              <span className="text-xs ml-2 px-2 py-0.5 rounded-full font-medium" style={{ background: '#f0fdf4', color: '#16a34a' }}>基于你的学习数据</span>
            </div>
            {knowledge.length > 0 ? (
              <div className="space-y-3">
                {knowledge.map((item) => (
                  <div key={item.tag}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: '#64748b' }}>{item.tag}</span>
                      <span className="font-medium" style={{ color: item.mastery >= 70 ? '#16a34a' : item.mastery >= 50 ? '#d97706' : '#dc2626' }}>
                        {item.mastery}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: '#f0f2ed' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${item.mastery}%`,
                          background: item.mastery >= 70
                            ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                            : item.mastery >= 50
                              ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                              : 'linear-gradient(90deg, #ef4444, #f87171)',
                        }}
                      />
                    </div>
                  </div>
                ))}
                {/* AI 知识分析 */}
                <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  {aiAnalysis ? (
                    <div className="p-3 rounded-xl text-sm whitespace-pre-wrap" style={{ background: '#f8fafc', border: '1px solid #e6e8e3', color: '#334155' }}>
                      {aiAnalysis}
                    </div>
                  ) : (
                    <button
                      onClick={handleKnowledgeAnalysis}
                      disabled={aiAnalysisLoading}
                      className="w-full py-2.5 rounded-xl text-xs font-medium transition-all"
                      style={{
                        background: aiAnalysisLoading ? 'rgba(99,102,241,0.05)' : 'rgba(99,102,241,0.12)',
                        border: '1px solid rgba(99,102,241,0.2)',
                        color: aiAnalysisLoading ? '#64748b' : '#a5b4fc',
                        cursor: aiAnalysisLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {aiAnalysisLoading ? '⏳ AI 分析中...' : '🤖 AI 分析我的知识水平'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ color: '#94a3b8' }}>暂无学习数据，开始闯关吧 🚀</div>
            )}
          </div>

          {/* AI 学习周报 */}
          <div className="p-5 rounded-2xl" style={{ background: '#ffffff', border: '1px solid #e6e8e3', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <h3 className="text-lg font-bold" style={{ color: '#1e293b' }}>学习周报</h3>
              </div>
              <button
                onClick={handleWeeklyReport}
                disabled={weeklyLoading}
                className="px-4 py-2 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: weeklyLoading ? '#f4f6f1' : '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  color: weeklyLoading ? '#94a3b8' : '#059669',
                  cursor: weeklyLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {weeklyLoading ? '⏳ 生成中...' : '📊 生成本周报告'}
              </button>
            </div>
            {weeklyReport ? (
              <div className="p-3 rounded-xl text-sm whitespace-pre-wrap" style={{ background: '#f8fafc', border: '1px solid #e6e8e3', color: '#334155' }}>
                {weeklyReport}
              </div>
            ) : (
              <div style={{ color: '#94a3b8' }}>点击生成按钮，小智为你总结本周学习情况</div>
            )}
          </div>

          {/* 成就展示 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: '#1e293b' }}>成就</h3>
              <span className="text-sm" style={{ color: '#64748b' }}>
                已解锁 <span className="font-semibold" style={{ color: '#d97706' }}>{achievements.filter(a => a.unlocked).length}</span> / {achievements.length}
              </span>
            </div>
            {achievements.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {achievements.map((ach) => <AchievementCard key={ach.id} achievement={ach} />)}
              </div>
            ) : (
              <div className="text-center py-12 rounded-2xl" style={{ background: '#ffffff', border: '1px solid #e6e8e3' }}>
                <p className="text-4xl mb-3">🏆</p>
                <p style={{ color: '#64748b' }}>完成课时和挑战来解锁成就</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  )
}

const statAccentColors = ['#10b981', '#0ea5e9', '#22c55e', '#f59e0b']
function StatCard({ label, value, icon, suffix, index = 0 }: { label: string; value: number; icon: string; suffix?: string; index?: number }) {
  const isEmpty = value === 0
  const accentColor = statAccentColors[index % statAccentColors.length]
  return (
    <div className="rounded-xl p-4 text-center transition-all duration-300 hover:-translate-y-1"
      style={{
        background: '#ffffff',
        border: '1px solid #e6e8e3',
        boxShadow: `0 1px 3px rgba(0,0,0,0.03), inset 0 1px 0 ${accentColor}12`,
      }}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold tabular-nums" style={{ color: isEmpty ? '#cbd5e1' : '#1e293b' }}>{value}{suffix && value > 0 ? suffix : ''}</div>
      <div className="text-xs mt-1" style={{ color: '#94a3b8' }}>{label}</div>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="animate-pulse min-h-screen" style={{ background: '#fafbf8' }}>
      <nav className="border-b" style={{ background: 'rgba(250,251,248,0.85)', borderColor: '#e6e8e3' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="h-8 w-32 rounded skeleton-shimmer" />
          <div className="flex gap-3">
            <div className="h-9 w-20 rounded-lg skeleton-shimmer" />
            <div className="h-9 w-16 rounded-lg skeleton-shimmer" />
          </div>
        </div>
      </nav>
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <div className="rounded-2xl p-6" style={{ background: '#ffffff', border: '1px solid #e6e8e3' }}>
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
            <div key={i} className="rounded-xl p-4" style={{ background: '#ffffff', border: '1px solid #e6e8e3' }}>
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
