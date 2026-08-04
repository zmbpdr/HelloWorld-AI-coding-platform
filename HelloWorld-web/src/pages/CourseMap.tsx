/**
 * 闯关地图页面 - CourseMap
 * 功能：展示某一编程语言的所有课时关卡列表，
 * 支持课时状态的视觉区分（已完成/可进行/进行中/锁定），
 * 包含棋子跳跃动画和推荐课程提示。
 */
import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useCourseStore } from '../stores/courseStore'
import PageTransition from '../components/ui/PageTransition'
import StarBadge from '../components/badge/StarBadge'
import ChessPiece from '../components/badge/ChessPiece'
import apiClient from '../api/client'

/** 将得分（0-100）转换为星级（0-5） */
function scoreToStars(score: number): number {
  if (score <= 0) return 0
  return Math.min(5, Math.max(1, Math.floor((score + 19) / 20)))
}

// 各课时的状态样式配置：已完成 / 可进行 / 进行中 / 锁定
const statusConfig: Record<string, { border: string; bg: string; dotBg: string; glow: string; leftBorder: string; textColor: string }> = {
  completed:   { border: '1px solid #bbf7d0', bg: '#f0fdf4', dotBg: '#22c55e', glow: '0 0 0 4px rgba(34,197,94,0.06)', leftBorder: '#22c55e', textColor: '#16a34a' },
  available:   { border: '1px solid #a7f3d0', bg: '#ffffff', dotBg: '#10b981', glow: '0 0 0 4px rgba(16,185,129,0.08)', leftBorder: '#10b981', textColor: '#059669' },
  in_progress: { border: '1px solid #fde68a', bg: '#fffbeb', dotBg: '#f59e0b', glow: '0 0 0 4px rgba(245,158,11,0.1)', leftBorder: '#f59e0b', textColor: '#d97706' },
  locked:      { border: '1px solid #e6e8e3', bg: '#f8fafc', dotBg: '#cbd5e1', glow: 'none', leftBorder: '#e6e8e3', textColor: '#94a3b8' },
}

/**
 * 闯关地图页面组件
 * 展示单个语言的学习路线，包含课时节点列表和状态
 */
export default function CourseMap() {
  const { languageSlug } = useParams<{ languageSlug: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { currentLanguage, fetchLanguageMap, isLoading } = useCourseStore()
  const containerRef = useRef<HTMLDivElement>(null)

  const [jumpState, setJumpState] = useState<{
    active: boolean; fromY: number; toY: number; pieceX: number
  }>({ active: false, fromY: 0, toY: 0, pieceX: 44 })
  const [pieceVisible, setPieceVisible] = useState(false)
  const [pieceNodeIdx, setPieceNodeIdx] = useState(-1)
  const [recommendations, setRecommendations] = useState<{
    lesson_id: number; slug: string; title: string; reason: string; matched_tags: string[]
  }[]>([])

  const fromLessonId = (location.state as any)?.fromLessonId as number | undefined
  const completedAt = (location.state as any)?.ts as number | undefined

  // 获取当前语言的地图数据
  useEffect(() => { if (languageSlug) fetchLanguageMap(languageSlug) }, [languageSlug, fetchLanguageMap, location.state])

  // 加载推荐课程
  useEffect(() => {
    if (!languageSlug) return
    apiClient.get(`/lessons/recommend?language=${languageSlug}`)
      .then(res => setRecommendations(res.data.recommended || []))
      .catch(() => setRecommendations([]))
  }, [languageSlug])

  // 棋子跳跃动画：从上一个完成课时跳到下一个可用课时
  useEffect(() => {
    if (!currentLanguage || !fromLessonId || !completedAt) return
    if (Date.now() - completedAt > 5000) return
    const lessons = currentLanguage.lessons
    const fromIdx = lessons.findIndex(l => l.id === fromLessonId)
    if (fromIdx === -1) return
    const nextIdx = lessons.findIndex((l, i) => i > fromIdx && l.status !== 'locked')
    const targetIdx = nextIdx !== -1 ? nextIdx : fromIdx
    requestAnimationFrame(() => {
      const nodes = containerRef.current?.querySelectorAll('[data-node-id]')
      if (!nodes || nodes.length === 0) return
      const fromEl = nodes[fromIdx] as HTMLElement
      const toEl = nodes[targetIdx] as HTMLElement
      if (!fromEl || !toEl) return
      const containerRect = containerRef.current!.getBoundingClientRect()
      const fromRect = fromEl.getBoundingClientRect()
      const toRect = toEl.getBoundingClientRect()
      const fromY = fromRect.top - containerRect.top + fromRect.height / 2 - 18
      const toY = toRect.top - containerRect.top + toRect.height / 2 - 18
      setPieceNodeIdx(targetIdx)
      setJumpState({ active: true, fromY, toY, pieceX: 44 })
      setPieceVisible(true)
      setTimeout(() => setJumpState(prev => ({ ...prev, active: false, fromY: toY })), 600)
      window.history.replaceState({}, '')
    })
  }, [currentLanguage, fromLessonId, completedAt])

  // 首次加载时定位棋子到"进行中"或"可进行"的课时
  useEffect(() => {
    if (!currentLanguage || fromLessonId) return
    const lessons = currentLanguage.lessons
    const idx = lessons.findIndex(l => l.status === 'in_progress')
    if (idx !== -1) { setPieceNodeIdx(idx); setPieceVisible(true); setJumpState(prev => ({ ...prev, active: false })) }
    else {
      const availIdx = lessons.findIndex(l => l.status === 'available')
      if (availIdx !== -1) { setPieceNodeIdx(availIdx); setPieceVisible(true); setJumpState(prev => ({ ...prev, active: false })) }
    }
  }, [currentLanguage, fromLessonId])

  /** 点击课时：锁定状态不可点击，否则跳转到课时页面 */
  const handleLessonClick = (lessonId: number, status: string | null) => {
    if (status === 'locked') return
    navigate(`/${languageSlug}/${lessonId}`)
  }

  if (isLoading) return <CourseMapSkeleton />
  if (!currentLanguage) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#fafbf8' }}>
        <p className="text-5xl">🗳</p>
        <p className="text-lg" style={{ color: '#64748b' }}>课程未找到</p>
        <button onClick={() => navigate('/')} className="text-sm font-medium" style={{ color: '#059669' }}>← 返回大厅</button>
      </div>
    )
  }

  const langColor = currentLanguage.color || '#10b981'
  const lessons = currentLanguage.lessons

  return (
    <PageTransition>
      <div className="min-h-screen mesh-bg" style={{ background: '#fafbf8' }}>
        <nav
          className="sticky top-0 z-40 nav-glow"
          style={{ background: 'rgba(250,251,248,0.85)', backdropFilter: 'blur(24px)', borderBottom: '1px solid #e6e8e3' }}
        >
          <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
            <button onClick={() => navigate('/')} className="text-sm transition-colors font-medium" style={{ color: '#64748b' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#1e293b' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#64748b' }}
            >← 返回大厅</button>
            <h1 className="text-xl font-bold" style={{ color: langColor }}>{currentLanguage.name}</h1>
            <div className="ml-auto flex items-center gap-3 text-xs" style={{ color: '#94a3b8' }}>
              <span>{lessons.filter(l => l.status === 'completed').length}/{lessons.length} 已完成</span>
            </div>
          </div>
        </nav>

        <div className="max-w-3xl mx-auto px-6 py-12" ref={containerRef}>
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#1e293b' }}>{currentLanguage.name} · 学习路线</h2>
          <p className="mb-10 text-sm" style={{ color: '#64748b' }}>{currentLanguage.description}</p>

          <div className="relative">
            <div className="absolute left-[25px] top-[26px] bottom-[26px] w-0.5 rounded-full"
              style={{ background: `linear-gradient(180deg, ${langColor}40, ${langColor}15, transparent)` }}
            />

            <div className="space-y-3">
              {lessons.map((lesson, index) => {
                const status = lesson.status || 'locked'
                const cfg = statusConfig[status] || statusConfig.locked
                const isClickable = status !== 'locked'
                const isCurrentNode = pieceVisible && !jumpState.active && pieceNodeIdx === index

                return (
                  <button
                    key={lesson.id}
                    data-node-id={lesson.id}
                    onClick={() => handleLessonClick(lesson.id, lesson.status)}
                    disabled={!isClickable}
                    className={`relative flex items-center gap-4 w-full text-left p-4 rounded-xl transition-all duration-300 ${
                      isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
                    }`}
                    style={{
                      background: cfg.bg,
                      border: cfg.border,
                      borderLeft: `3px solid ${cfg.leftBorder}`,
                      boxShadow: isCurrentNode && status !== 'locked' ? cfg.glow : '0 1px 2px rgba(0,0,0,0.03)',
                    }}
                    onMouseEnter={e => {
                      if (isClickable) {
                        e.currentTarget.style.background = '#ecfdf5'
                        e.currentTarget.style.borderLeftColor = '#10b981'
                        e.currentTarget.style.transform = 'translateX(6px)'
                        e.currentTarget.style.boxShadow = '0 2px 12px rgba(16,185,129,0.08)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (isClickable) {
                        e.currentTarget.style.background = cfg.bg
                        e.currentTarget.style.borderLeftColor = ''
                        e.currentTarget.style.borderLeft = `3px solid ${cfg.leftBorder}`
                        e.currentTarget.style.transform = ''
                        e.currentTarget.style.boxShadow = isCurrentNode ? cfg.glow : '0 1px 2px rgba(0,0,0,0.03)'
                      }
                    }}
                  >
                    <div
                      className="relative z-10 w-[50px] h-[50px] rounded-full flex items-center justify-center font-bold text-lg shrink-0 transition-all duration-300"
                      style={{
                        background: cfg.dotBg + (isCurrentNode ? '20' : '10'),
                        border: `2px solid ${cfg.dotBg}`,
                        color: cfg.textColor,
                      }}
                    >
                      {isCurrentNode && pieceVisible && !jumpState.active ? (
                        <ChessPiece color={langColor} size={30} animated />
                      ) : status === 'completed' ? (
                        <span style={{ fontSize: 18 }}>✓</span>
                      ) : status === 'in_progress' ? (
                        <span style={{ fontSize: 18 }}>▶</span>
                      ) : (
                        <span style={{ fontSize: 15 }}>{index + 1}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate" style={{ color: status === 'locked' ? '#94a3b8' : '#1e293b' }}>
                        {lesson.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs font-medium" style={{ color: '#d97706' }}>+{lesson.xp_reward} XP</span>
                        {lesson.difficulty && (
                          <span className="text-xs" style={{ color: '#94a3b8' }}>{lesson.difficulty}</span>
                        )}
                        {status === 'completed' && lesson.best_score > 0 && (
                          <StarBadge stars={scoreToStars(lesson.best_score)} size="sm" />
                        )}
                        {recommendations.some(r => r.lesson_id === lesson.id) && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                            ⭐ 推荐
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-sm" style={{ color: '#94a3b8' }}>
                      {status === 'locked' ? '🔒' : '→'}
                    </div>
                  </button>
                )
              })}
            </div>

            {pieceVisible && jumpState.active && (
              <div
                className="absolute z-50"
                style={{
                  left: jumpState.pieceX, top: jumpState.fromY,
                  animation: 'piece-jump 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                  '--jump-to': `${jumpState.toY - jumpState.fromY}px`,
                } as React.CSSProperties}
              >
                <ChessPiece color={langColor} size={36} jumping />
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes piece-jump {
          0%   { transform: translateY(0) scale(1, 1); }
          30%  { transform: translateY(calc(var(--jump-to) * 0.3 - 24px)) scale(1.15, 0.85); }
          50%  { transform: translateY(calc(var(--jump-to) * 0.5 - 32px)) scale(1, 1); }
          70%  { transform: translateY(calc(var(--jump-to) * 0.7 - 16px)) scale(1.1, 0.9); }
          85%  { transform: translateY(calc(var(--jump-to) - 4px)) scale(1, 1); }
          100% { transform: translateY(var(--jump-to)) scale(1, 1); }
        }
      `}</style>
    </PageTransition>
  )
}

function CourseMapSkeleton() {
  return (
    <div className="animate-pulse min-h-screen" style={{ background: '#fafbf8' }}>
      <nav className="border-b" style={{ background: 'rgba(250,251,248,0.85)', borderColor: '#e6e8e3' }}>
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <div className="h-5 w-20 rounded skeleton-shimmer" />
          <div className="h-6 w-28 rounded skeleton-shimmer" />
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="h-8 w-48 rounded skeleton-shimmer mb-2" />
        <div className="h-4 w-64 rounded skeleton-shimmer mb-10" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: '#ffffff', border: '1px solid #e6e8e3' }}>
              <div className="w-[50px] h-[50px] rounded-full skeleton-shimmer shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-3/4 rounded skeleton-shimmer" />
                <div className="h-3 w-16 rounded skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
