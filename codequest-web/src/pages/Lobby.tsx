import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCourseStore } from '../stores/courseStore'
import { useUserStore } from '../stores/userStore'
import AuthModal from '../components/auth/AuthModal'
import PageTransition from '../components/ui/PageTransition'
import ActivityHeatmap from '../components/ui/ActivityHeatmap'
import SnippetPanel from '../components/snippets/SnippetPanel'
import { getAgentTracks, type TrackOverview } from '../api/agent'

type TabKey = 'languages' | 'workshop'

const TABS: { key: TabKey; label: string; icon: string; description: string }[] = [
  { key: 'languages', label: '编程闯关', icon: '</>', description: '14 门编程语言 · 循序渐进攻克' },
  { key: 'workshop', label: '智能体工坊', icon: '🧠', description: 'AI / 机器学习 / Agent开发 · 神经元网络' },
]

const AGENT_TRACKS = [
  { slug: 'ml', name: '机器学习', color: '#14b8a6', icon: '🧠', description: '从数学基础到经典算法，构建ML知识体系', nodes: 8 },
  { slug: 'agent', name: 'Agent开发', color: '#6366f1', icon: '🤖', description: '从工具调用到多智能体协作，掌握Agent开发全栈', nodes: 8 },
  { slug: 'llm', name: '大模型应用', color: '#ec4899', icon: '🧬', description: '从Prompt工程到RAG架构，深入大模型应用开发', nodes: 8 },
  { slug: 'project', name: '综合项目', color: '#f59e0b', icon: '🏗️', description: '真实项目实战，将所学知识融会贯通', nodes: 8 },
  { slug: 'dl', name: '深度学习', color: '#8b5cf6', icon: '🔬', description: '从神经网络到Transformer，系统掌握深度学习技术栈', nodes: 12 },
  { slug: 'nlp', name: '自然语言处理', color: '#06b6d4', icon: '💬', description: '从文本预处理到LLM微调，精通NLP全链路', nodes: 10 },
  { slug: 'cv', name: '计算机视觉', color: '#10b981', icon: '👁️', description: '从图像分类到目标检测，覆盖CV四大核心任务', nodes: 10 },
  { slug: 'rl', name: '强化学习', color: '#f97316', icon: '🎮', description: '从Q-Learning到PPO，深入强化学习算法', nodes: 8 },
]

export default function Lobby() {
  const navigate = useNavigate()
  const { languages, fetchLanguages, isLoading, error } = useCourseStore()
  const { isAuthenticated } = useUserStore()
  const [showAuth, setShowAuth] = useState(false)
  const [showSnippets, setShowSnippets] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('languages')
  const [agentTracks, setAgentTracks] = useState<TrackOverview[]>([])

  useEffect(() => { fetchLanguages() }, [fetchLanguages, isAuthenticated])
  useEffect(() => { if (isAuthenticated) getAgentTracks().then(setAgentTracks).catch(() => {}) }, [isAuthenticated, activeTab])

  const requireAuth = useCallback((fn: () => void) => {
    if (!isAuthenticated) { setShowAuth(true); return }
    fn()
  }, [isAuthenticated])

  const difficultyOrder: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 }
  const sortedLanguages = useMemo(() => {
    return [...languages].sort((a, b) => {
      const da = difficultyOrder[a.difficulty || 'beginner'] ?? 0
      const db = difficultyOrder[b.difficulty || 'beginner'] ?? 0
      if (da !== db) return da - db
      return b.total_lessons - a.total_lessons
    })
  }, [languages])

  const difficultyColorMap: Record<string, string> = {
    beginner: 'text-emerald-600 bg-emerald-50',
    intermediate: 'text-amber-600 bg-amber-50',
    advanced: 'text-rose-600 bg-rose-50',
  }

  return (
    <PageTransition>
      <div className="min-h-screen relative mesh-bg" style={{ background: 'linear-gradient(180deg, #fafbf8 0%, #f5f7f3 30%, #f8faf6 60%, #fafbf8 100%)' }}>

        {/* 背景网格 */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(#e6e8e3 1px, transparent 1px), linear-gradient(90deg, #e6e8e3 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        {/* 柔和光晕 */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          <div className="particle-orb" style={{ width: 420, height: 420, background: 'radial-gradient(circle, rgba(16,185,129,0.12), transparent 70%)', top: '-8%', left: '10%', animation: 'orb-float-1 16s ease-in-out infinite' }} />
          <div className="particle-orb" style={{ width: 340, height: 340, background: 'radial-gradient(circle, rgba(14,165,233,0.1), transparent 70%)', top: '25%', right: '5%', animation: 'orb-float-2 18s ease-in-out infinite' }} />
          <div className="particle-orb" style={{ width: 300, height: 300, background: 'radial-gradient(circle, rgba(245,158,11,0.08), transparent 70%)', bottom: '20%', left: '30%', animation: 'orb-float-3 15s ease-in-out infinite' }} />
          <div className="particle-orb" style={{ width: 260, height: 260, background: 'radial-gradient(circle, rgba(139,92,246,0.06), transparent 70%)', bottom: '40%', right: '20%', animation: 'orb-float-1 20s ease-in-out infinite' }} />
        </div>

        {/* 导航栏 */}
        <nav className="sticky top-0 z-40 nav-glow" style={{ background: 'rgba(250,251,248,0.85)', backdropFilter: 'blur(24px)', borderBottom: '1px solid #e6e8e3' }}>
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                <span className="text-white font-bold text-sm">{'</>'}</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: '#1e293b' }}>
                Hello World
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                <button
                  onClick={() => navigate('/errors')}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:-translate-y-0.5"
                  style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(239,68,68,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.boxShadow = '' }}
                >
                  📝 错题本
                </button>
                <button
                  onClick={() => setShowSnippets(true)}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:-translate-y-0.5"
                  style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#d1fae5'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(16,185,129,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#ecfdf5'; e.currentTarget.style.boxShadow = '' }}
                >
                  📌 收藏
                </button>
                <button
                  onClick={() => navigate('/leaderboard')}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:-translate-y-0.5"
                  style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#fef3c7'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(245,158,11,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fffbeb'; e.currentTarget.style.boxShadow = '' }}
                >
                  🏆 排行
                </button>
                <button
                  onClick={() => navigate('/profile')}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:-translate-y-0.5"
                  style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.boxShadow = '' }}
                >
                  个人中心
                </button>
                <button
                  onClick={() => navigate('/pricing')}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', boxShadow: '0 2px 8px rgba(16,185,129,0.2)' }}
                >
                  Pro
                </button>
                </>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    boxShadow: '0 4px 16px rgba(16,185,129,0.25)',
                  }}
                >
                  登录
                </button>
              )}
            </div>
          </div>
        </nav>

        {/* 英雄区域 */}
        <section className="relative max-w-7xl mx-auto px-6 pt-20 pb-8 text-center">
          <h2 className="text-5xl font-extrabold mb-4 tracking-tight leading-tight" style={{ color: '#1e293b' }}>
            开启你的{' '}
            <span style={{
              background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 40%, #0ea5e9 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              编程之旅
            </span>
          </h2>
          <p className="text-base max-w-xl mx-auto" style={{ color: '#64748b', lineHeight: 1.7 }}>
            选择学习路线，AI 导师随时为你答疑解惑
          </p>
        </section>

        {/* 能力诊断入口 */}
        {isAuthenticated && !localStorage.getItem('diagnostic_completed') && (
          <div className="relative max-w-7xl mx-auto px-6 pb-4">
            <div
              className="p-4 rounded-2xl flex items-center justify-between"
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🧠</span>
                <div>
                  <span className="font-medium" style={{ color: '#059669' }}>能力诊断</span>
                  <span className="text-sm ml-2" style={{ color: '#64748b' }}>首次使用？测测你的水平，获取个性化学习起点</span>
                </div>
              </div>
              <button
                onClick={() => navigate('/diagnostic')}
                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all hover:-translate-y-0.5 text-white"
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  boxShadow: '0 2px 12px rgba(16,185,129,0.25)',
                }}
              >
                开始诊断 →
              </button>
            </div>
          </div>
        )}

        {/* 内容切换区 */}
        <div className="relative max-w-7xl mx-auto px-6 pb-6">
          <div className="flex items-center gap-1.5 p-1 rounded-2xl" style={{ background: '#ffffff', border: '1px solid #e6e8e3', width: 'fit-content', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300"
                  style={{
                    background: isActive ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
                    color: isActive ? '#ffffff' : '#64748b',
                    boxShadow: isActive ? '0 2px 12px rgba(16,185,129,0.25)' : 'none',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#334155'
                      e.currentTarget.style.background = '#f4f6f1'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#64748b'
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  <span className="text-base">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
          <p className="text-xs mt-3" style={{ color: '#94a3b8' }}>
            {TABS.find(t => t.key === activeTab)?.description}
          </p>
        </div>

        {/* === 编程闯关面板 === */}
        {activeTab === 'languages' && (
          <section className="relative max-w-7xl mx-auto px-6 pb-24">
            {error ? (
              <div className="text-center py-20">
                <p className="text-5xl mb-4">⚠️</p>
                <p className="text-lg" style={{ color: '#64748b' }}>{error}</p>
                <button onClick={fetchLanguages} className="mt-5 px-5 py-2.5 rounded-xl text-sm font-medium text-white"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>重试</button>
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-2xl p-6 animate-pulse" style={{ background: '#ffffff', border: '1px solid #e6e8e3', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-11 h-11 rounded-xl skeleton-shimmer" />
                      <div className="flex-1">
                        <div className="h-5 w-20 rounded skeleton-shimmer" />
                        <div className="h-3.5 w-12 rounded skeleton-shimmer mt-2" />
                      </div>
                    </div>
                    <div className="h-3.5 w-3/4 rounded skeleton-shimmer mb-4" />
                    <div className="h-2 rounded-full skeleton-shimmer" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {sortedLanguages.map((lang) => {
                  const diffLabel = ({ beginner: '入门', intermediate: '进阶', advanced: '高级' }[lang.difficulty || 'beginner'] || '入门')
                  const isLocked = !isAuthenticated
                  const progressPercent = Math.round(lang.progress_percent)
                  const isCompleted = progressPercent === 100 && lang.total_lessons > 0

                  return (
                    <button
                      key={lang.slug}
                      onClick={() => requireAuth(() => navigate(`/${lang.slug}`))}
                      className={`group text-left rounded-2xl p-5 card-3d transition-all duration-300 ${
                        isLocked ? 'opacity-50 cursor-pointer' : ''
                      }`}
                      style={{
                        background: '#ffffff',
                        border: isCompleted ? `1.5px solid ${lang.color || '#10b981'}40` : '1px solid #e6e8e3',
                        boxShadow: isCompleted ? `0 0 30px ${lang.color || '#10b981'}08` : '0 1px 3px rgba(0,0,0,0.03)',
                      }}
                      onMouseEnter={e => {
                        if (!isLocked) {
                          e.currentTarget.style.borderColor = `${lang.color || '#10b981'}60`
                          e.currentTarget.style.boxShadow = `0 8px 30px rgba(0,0,0,0.06), 0 0 0 1px ${lang.color || '#10b981'}10`
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isLocked) {
                          e.currentTarget.style.borderColor = isCompleted ? `${lang.color || '#10b981'}40` : '#e6e8e3'
                          e.currentTarget.style.boxShadow = isCompleted ? `0 0 30px ${lang.color || '#10b981'}08` : '0 1px 3px rgba(0,0,0,0.03)'
                        }
                      }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="rounded-xl flex items-center justify-center font-bold transition-transform group-hover:scale-110"
                          style={{
                            width: 44, height: 44,
                            backgroundColor: `${lang.color || '#10b981'}12`,
                            color: lang.color || '#1e293b',
                            fontSize: isLocked ? 20 : 18,
                          }}
                        >
                          {isLocked ? '🔒' : lang.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-semibold transition-colors" style={{ color: '#1e293b', fontSize: 16 }}>
                            {lang.name}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyColorMap[lang.difficulty || 'beginner'] || difficultyColorMap.beginner}`}>{diffLabel}</span>
                        </div>
                      </div>
                      <p className="text-sm mb-4 line-clamp-2" style={{ color: '#64748b' }}>
                        {lang.description || '开始学习之旅'}
                      </p>
                      {lang.total_lessons > 0 ? (
                        <div>
                          <div className="flex justify-between text-xs mb-2" style={{ color: '#94a3b8' }}>
                            <span className="font-medium tabular-nums">{lang.completed_lessons} / {lang.total_lessons} 关</span>
                            {progressPercent > 0 && <span className="font-mono tabular-nums">{progressPercent}%</span>}
                          </div>
                          <div className="rounded-full overflow-hidden h-2" style={{ background: '#f0f2ed' }}>
                            <div
                              className="h-full rounded-full transition-all duration-700 ease-out"
                              style={{
                                width: `${progressPercent}%`,
                                background: progressPercent > 0
                                  ? `linear-gradient(90deg, ${lang.color || '#10b981'}, ${lang.color || '#10b981'}cc)`
                                  : 'transparent',
                              }}
                            />
                          </div>
                          <p className="text-xs mt-2" style={{ color: progressPercent === 0 ? '#94a3b8' : progressPercent === 100 ? '#059669' : '#94a3b8' }}>
                            {progressPercent === 0 ? '点击开始学习' : progressPercent === 100 ? '全部通关!' : `${lang.total_lessons - lang.completed_lessons} 关待完成`}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm mb-2" style={{ color: '#94a3b8' }}>暂无课时</p>
                          <div className="h-2 rounded-full" style={{ background: '#f0f2ed' }} />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* === 智能体工坊面板 === */}
        {activeTab === 'workshop' && (
          <section className="relative max-w-7xl mx-auto px-6 pb-24">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {AGENT_TRACKS.map((track) => {
                const isLocked = !isAuthenticated
                return (
                <button
                  key={track.slug}
                  onClick={() => requireAuth(() => navigate(`/workshop?track=${track.slug}`))}
                  className={`group text-left rounded-2xl p-5 card-3d transition-all duration-300 ${
                    isLocked ? 'opacity-40 cursor-pointer' : ''
                  }`}
                  style={{
                    background: '#ffffff',
                    border: `1px solid ${track.color}30`,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                  onMouseEnter={e => {
                    if (isLocked) return
                    e.currentTarget.style.borderColor = `${track.color}60`
                    e.currentTarget.style.boxShadow = `0 4px 20px ${track.color}10`
                  }}
                  onMouseLeave={e => {
                    if (isLocked) return
                    e.currentTarget.style.borderColor = `${track.color}30`
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)'
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="rounded-xl flex items-center justify-center text-xl font-bold transition-transform group-hover:scale-110 shrink-0"
                      style={{ width: 44, height: 44, backgroundColor: `${track.color}12` }}
                    >
                      {track.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold transition-colors" style={{ color: '#1e293b', fontSize: 15 }}>
                        {track.name}
                      </h3>
                      <span className="text-xs" style={{ color: track.color }}>{track.nodes} 个节点</span>
                    </div>
                  </div>
                  <p className="text-xs mb-4 line-clamp-2" style={{ color: '#64748b' }}>
                    {track.description}
                  </p>

                  {(() => {
                    const completed = agentTracks.find(t => t.track === track.slug)?.completed_nodes || 0
                    const percent = track.nodes > 0 ? Math.round(completed / track.nodes * 100) : 0
                    return (
                      <div>
                        <div className="flex justify-between text-xs mb-2" style={{ color: '#94a3b8' }}>
                          <span className="font-medium tabular-nums">{completed} / {track.nodes} 节点</span>
                          {percent > 0 && <span className="font-mono tabular-nums">{percent}%</span>}
                        </div>
                        <div className="rounded-full overflow-hidden h-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <div className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${percent}%`, background: `linear-gradient(90deg, ${track.color}, ${track.color}cc)` }} />
                        </div>
                      </div>
                    )
                  })()}

                </button>
              )})}
            </div>
          </section>
        )}

        {/* 学习热力图 */}
        {isAuthenticated && (
          <section className="relative max-w-3xl mx-auto px-6 pb-12">
            <div className="p-5 rounded-2xl" style={{ background: '#ffffff', border: '1px solid #e6e8e3', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <ActivityHeatmap />
            </div>
          </section>
        )}

        {/* 页脚 */}
        <footer className="border-t py-8 text-center" style={{ borderColor: '#e6e8e3' }}>
          <p style={{ color: '#94a3b8', fontSize: 13 }}>© 2026 Hello World · 让编程学习像游戏一样有趣</p>
        </footer>

        <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
        <SnippetPanel isOpen={showSnippets} onClose={() => setShowSnippets(false)} />
      </div>
    </PageTransition>
  )
}
