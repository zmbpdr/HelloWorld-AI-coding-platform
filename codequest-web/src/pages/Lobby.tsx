import { useEffect, useState, useMemo, useCallback } from 'react'

import { useNavigate } from 'react-router-dom'

import { useCourseStore } from '../stores/courseStore'

import { useUserStore } from '../stores/userStore'

import AuthModal from '../components/auth/AuthModal'

import PageTransition from '../components/ui/PageTransition'
import ActivityHeatmap from '../components/ui/ActivityHeatmap'
import SnippetPanel from '../components/snippets/SnippetPanel'



type TabKey = 'languages' | 'workshop'

// ---- Tab definitions  -- extensible for future modules ----

// ---- Tab definitions ----



const TABS: { key: TabKey; label: string; icon: string; description: string }[] = [

  { key: 'languages', label: '编程闯关', icon: '</>', description: '14 门编程语言 · 循序渐进攻克' },

  { key: 'workshop', label: '智能体工坊', icon: '🧠', description: 'AI / 机器学习 / Agent开发 · 神经元网络' },

]



const AGENT_TRACKS = [

  { slug: 'ml', name: '机器学习', color: '#2dd4bf', icon: '🧠', description: '从数学基础到经典算法，构建ML知识体系', nodes: 8 },

  { slug: 'agent', name: 'Agent开发', color: '#818cf8', icon: '🤖', description: '从工具调用到多智能体协作，掌握Agent开发全栈', nodes: 8 },

  { slug: 'llm', name: '大模型应用', color: '#f472b6', icon: '🧬', description: '从Prompt工程到RAG架构，深入大模型应用开发', nodes: 8 },

  { slug: 'project', name: '综合项目', color: '#fbbf24', icon: '🏗️', description: '真实项目实战，将所学知识融会贯通', nodes: 8 },

  { slug: 'dl', name: '深度学习', color: '#a855f7', icon: '🔬', description: '从神经网络到Transformer，系统掌握深度学习技术栈', nodes: 12 },

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



  useEffect(() => { fetchLanguages() }, [fetchLanguages, isAuthenticated])



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

    beginner: 'text-emerald-400 bg-emerald-400/10',

    intermediate: 'text-amber-400 bg-amber-400/10',

    advanced: 'text-rose-400 bg-rose-400/10',

  }



  return (

    <PageTransition>

      <div className="min-h-screen relative mesh-bg" style={{ background: 'linear-gradient(180deg, #080c17 0%, #0a0f20 30%, #0c1025 60%, #080c17 100%)' }}>

        {/* 背景网格 + 光晕 */}

        <div

          className="fixed inset-0 pointer-events-none"

          style={{

            backgroundImage:

              'linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)',

            backgroundSize: '64px 64px',

          }}

        />

        {/* 浮动光晕粒子 */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          <div className="particle-orb" style={{ width: 420, height: 420, background: 'radial-gradient(circle, rgba(99,102,241,0.18), transparent 70%)', top: '-8%', left: '10%', animation: 'orb-float-1 14s ease-in-out infinite' }} />
          <div className="particle-orb" style={{ width: 340, height: 340, background: 'radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%)', top: '25%', right: '5%', animation: 'orb-float-2 16s ease-in-out infinite' }} />
          <div className="particle-orb" style={{ width: 300, height: 300, background: 'radial-gradient(circle, rgba(59,130,246,0.12), transparent 70%)', bottom: '20%', left: '30%', animation: 'orb-float-3 13s ease-in-out infinite' }} />
          <div className="particle-orb" style={{ width: 260, height: 260, background: 'radial-gradient(circle, rgba(244,114,182,0.1), transparent 70%)', bottom: '40%', right: '20%', animation: 'orb-float-1 18s ease-in-out infinite' }} />
        </div>

        {/* 导航栏 */}

        <nav className="sticky top-0 z-40 border-b border-white/[0.04] nav-glow" style={{ background: 'rgba(8,12,23,0.85)', backdropFilter: 'blur(24px)' }}>

          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

            <div className="flex items-center gap-3">

              <div

                className="w-9 h-9 rounded-xl flex items-center justify-center"

                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}

              >

                <span className="text-white font-bold text-sm">{'</>'}</span>

              </div>

              <h1 className="text-xl font-bold tracking-tight" style={{ color: '#f1f5f9' }}>

                CodeQuest

              </h1>

            </div>

            <div className="flex items-center gap-3">

              {isAuthenticated ? (
                <>
                <button
                  onClick={() => navigate('/errors')}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                  style={{ 
                    background: 'rgba(255,255,255,0.04)', 
                    color: '#f87171', 
                    border: '1px solid rgba(255,255,255,0.06)' 
                  }}
                  onMouseEnter={e => { 
                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; 
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' 
                  }}
                  onMouseLeave={e => { 
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; 
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' 
                  }}
                >
                  📝 错题本
                </button>
                <button
                  onClick={() => setShowSnippets(true)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.04)', color: '#818cf8', border: '1px solid rgba(255,255,255,0.06)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
                >
                  📌 收藏
                </button>
                <button
                  onClick={() => navigate('/leaderboard')}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.04)', color: '#fbbf24', border: '1px solid rgba(255,255,255,0.06)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
                >
                  🏆 排行
                </button>
                <button
                  onClick={() => navigate('/profile')}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.04)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.06)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
                >
                  个人中心
                </button>
                <button
                  onClick={() => navigate('/pricing')}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                  style={{ background: 'rgba(139,92,246,0.14)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.22)' }}
                >
                  Pro
                </button>
                </>
              ) : (

                <button

                  onClick={() => setShowAuth(true)}

                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:brightness-110"

                  style={{

                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',

                    boxShadow: '0 4px 16px rgba(99,102,241,0.3)',

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

          <h2 className="text-5xl font-extrabold mb-4 tracking-tight leading-tight" style={{ color: '#f1f5f9' }}>

            开启你的{' '}

            <span style={{

              background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 40%, #f472b6 100%)',

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


{/* 🆕 能力诊断入口 - 插在这里 */}
        {isAuthenticated && !localStorage.getItem('diagnostic_completed') && (
          <div className="relative max-w-7xl mx-auto px-6 pb-4">
            <div 
              className="p-4 rounded-2xl flex items-center justify-between"
              style={{ 
                background: 'rgba(99,102,241,0.08)', 
                border: '1px solid rgba(99,102,241,0.15)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🧠</span>
                <div>
                  <span className="font-medium" style={{ color: '#a5b4fc' }}>能力诊断</span>
                  <span className="text-sm ml-2" style={{ color: '#94a3b8' }}>首次使用？测测你的水平，获取个性化学习起点</span>
                </div>
              </div>
              <button 
                onClick={() => navigate('/diagnostic')}
                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
                style={{ 
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  color: '#fff',
                  boxShadow: '0 2px 12px rgba(99,102,241,0.3)',
                }}
              >
                开始诊断 →
              </button>
            </div>
          </div>
        )}

        {/* 内容切换区 */}

        <div className="relative max-w-7xl mx-auto px-6 pb-6">

          <div className="flex items-center gap-2 p-1 rounded-2xl" style={{ background: 'rgba(15,19,34,0.8)', border: '1px solid rgba(255,255,255,0.06)', width: 'fit-content' }}>

            {TABS.map(tab => {

              const isActive = activeTab === tab.key

              return (

                <button

                  key={tab.key}

                  onClick={() => {
                    setActiveTab(tab.key)
                  }}

                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300"

                  style={{
                    background: isActive ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                    color: isActive ? '#ffffff' : '#64748b',
                    boxShadow: isActive ? '0 2px 12px rgba(99,102,241,0.35)' : 'none',
                  }}

                  onMouseEnter={e => {

                    if (!isActive) {

                      e.currentTarget.style.color = '#cbd5e1'

                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)'

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

          <p className="text-xs mt-3" style={{ color: '#475569' }}>

            {TABS.find(t => t.key === activeTab)?.description}

          </p>

        </div>



        {/* === 编程闯关面板 === */}

        {activeTab === 'languages' && (

          <section className="relative max-w-7xl mx-auto px-6 pb-24">

            {error ? (

              <div className="text-center py-20">

                <p className="text-5xl mb-4">⚠️</p>

                <p className="text-lg" style={{ color: '#94a3b8' }}>{error}</p>

                <button onClick={fetchLanguages} className="mt-5 px-5 py-2.5 rounded-xl text-sm font-medium text-white"

                  style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>重试</button>

              </div>

            ) : isLoading ? (

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">

                {Array.from({ length: 8 }).map((_, i) => (

                  <div key={i} className="rounded-2xl p-6 animate-pulse" style={{ background: 'rgba(15,19,34,0.8)', border: '1px solid rgba(255,255,255,0.04)' }}>

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

                  const diffColor = difficultyColorMap[lang.difficulty || 'beginner'] || difficultyColorMap.beginner

                  const diffLabel = ({ beginner: '入门', intermediate: '进阶', advanced: '高级' }[lang.difficulty || 'beginner'] || '入门')

                  const isLocked = !isAuthenticated

                  const progressPercent = Math.round(lang.progress_percent)

                  const isCompleted = progressPercent === 100 && lang.total_lessons > 0



                  return (

                    <button

                      key={lang.slug}

                      onClick={() => requireAuth(() => navigate(`/${lang.slug}`))}

                      className={`group text-left rounded-2xl p-5 card-3d transition-all duration-300 hover:-translate-y-1 ${

                        isLocked ? 'opacity-50 grayscale cursor-pointer' : ''

                      }`}

                      style={{

                        background: isLocked ? 'rgba(15,19,34,0.4)' : 'rgba(15,19,34,0.7)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',

                        border: isLocked

                          ? '1px solid rgba(255,255,255,0.04)'

                          : isCompleted

                            ? `1px solid ${lang.color || '#6366f1'}55`

                            : '1px solid rgba(255,255,255,0.06)',

                        boxShadow: isCompleted ? `0 0 36px ${lang.color || '#6366f1'}12, 0 0 12px ${lang.color || '#6366f1'}06` : undefined,

                      }}

                      onMouseEnter={e => {

                        if (!isLocked) {

                          e.currentTarget.style.background = 'rgba(15,19,34,0.9)'

                          e.currentTarget.style.borderColor = `${lang.color || '#6366f1'}88`

                          e.currentTarget.style.boxShadow = `0 8px 32px ${lang.color || '#6366f1'}20, 0 0 16px ${lang.color || '#6366f1'}08`

                        }

                      }}

                      onMouseLeave={e => {

                        if (!isLocked) {

                          e.currentTarget.style.background = 'rgba(15,19,34,0.7)'

                          e.currentTarget.style.borderColor = isCompleted ? `${lang.color || '#6366f1'}44` : 'rgba(255,255,255,0.05)'

                          e.currentTarget.style.boxShadow = isCompleted ? `0 0 36px ${lang.color || '#6366f1'}12, 0 0 12px ${lang.color || '#6366f1'}06` : ''

                        }

                      }}

                    >

                      <div className="flex items-center gap-3 mb-3">

                        <div

                          className="rounded-xl flex items-center justify-center font-bold transition-transform group-hover:scale-110"

                          style={{

                            width: 44, height: 44,

                            backgroundColor: `${lang.color || '#6366f1'}18`,

                            color: lang.color || '#f1f5f9',

                            fontSize: isLocked ? 20 : 18,

                          }}

                        >

                          {isLocked ? '🔒' : lang.name.charAt(0)}

                        </div>

                        <div>

                          <h3 className="font-semibold transition-colors" style={{ color: '#e2e8f0', fontSize: 16 }}>

                            {lang.name}

                          </h3>

                          <span className={`text-xs px-2 py-0.5 rounded-full ${diffColor}`}>{diffLabel}</span>

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

                          <div className="rounded-full overflow-hidden h-2" style={{ background: 'rgba(255,255,255,0.05)' }}>

                            <div

                              className="h-full rounded-full transition-all duration-700 ease-out"

                              style={{

                                width: `${progressPercent}%`,

                                background: progressPercent > 0

                                  ? `linear-gradient(90deg, ${lang.color || '#6366f1'}, ${lang.color || '#6366f1'}cc)`

                                  : 'transparent',

                              }}

                            />

                          </div>

                          <p className="text-xs mt-2" style={{ color: progressPercent === 0 ? '#475569' : progressPercent === 100 ? '#22c55e' : '#475569' }}>

                            {progressPercent === 0 ? '点击开始学习' : progressPercent === 100 ? '全部通关!' : `${lang.total_lessons - lang.completed_lessons} 关待完成`}

                          </p>

                        </div>

                      ) : (

                        <div>

                          <p className="text-sm mb-2" style={{ color: '#475569' }}>暂无课时</p>

                          <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />

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

                  className={`group text-left rounded-2xl p-5 card-3d transition-all duration-300 hover:-translate-y-1 ${

                    isLocked ? 'opacity-40 grayscale cursor-pointer' : ''

                  }`}

                  style={{

                    background: isLocked ? 'rgba(15,19,34,0.3)' : 'rgba(15,19,34,0.7)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',

                    border: isLocked

                      ? '1px solid rgba(255,255,255,0.04)'

                      : `1px solid ${track.color}33`,

                  }}

                  onMouseEnter={e => {

                    if (isLocked) return

                    e.currentTarget.style.background = 'rgba(15,19,34,0.9)'

                    e.currentTarget.style.borderColor = `${track.color}88`

                    e.currentTarget.style.boxShadow = `0 4px 24px ${track.color}18`

                  }}

                  onMouseLeave={e => {

                    if (isLocked) return

                    e.currentTarget.style.background = 'rgba(15,19,34,0.7)'

                    e.currentTarget.style.borderColor = `${track.color}33`

                    e.currentTarget.style.boxShadow = ''

                  }}

                >

                  <div className="flex items-center gap-3 mb-3">

                    <div

                      className="rounded-xl flex items-center justify-center text-xl font-bold transition-transform group-hover:scale-110 shrink-0"

                      style={{

                        width: 44, height: 44,

                        backgroundColor: `${track.color}18`,

                      }}

                    >

                      {track.icon}

                    </div>

                    <div>

                      <h3 className="font-semibold group-hover:text-blue-400 transition-colors" style={{ color: '#e2e8f0', fontSize: 15 }}>

                        {track.name}

                      </h3>

                      <span className="text-xs" style={{ color: track.color }}>{track.nodes} 个节点</span>

                    </div>

                  </div>

                  <p className="text-xs mb-4 line-clamp-2" style={{ color: '#64748b' }}>

                    {track.description}

                  </p>

                  <div className="flex items-center justify-between">

                    <div className="h-1.5 flex-1 mr-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>

                      <div className="h-full rounded-full transition-all duration-700"

                        style={{ width: isAuthenticated ? '10%' : '0%', background: track.color }} />

                    </div>

                    <span className="text-xs group-hover:translate-x-1 transition-transform" style={{ color: track.color }}>→</span>

                  </div>

                </button>

              )})}

            </div>

          </section>

        )}



        {/* 学习热力图（仅登录后可见）*/}
        {isAuthenticated && (
          <section className="relative max-w-3xl mx-auto px-6 pb-12">
            <div className="p-5 rounded-2xl" style={{ background: 'rgba(15,19,34,0.5)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <ActivityHeatmap />
            </div>
          </section>
        )}

        {/* 页脚 */}
        <footer className="border-t border-white/[0.03] py-8 text-center">
          <p style={{ color: '#334155', fontSize: 13 }}>© 2026 CodeQuest · 让编程学习像游戏一样有趣</p>
        </footer>

        <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
        <SnippetPanel isOpen={showSnippets} onClose={() => setShowSnippets(false)} />

      </div>

    </PageTransition>

  )

}



