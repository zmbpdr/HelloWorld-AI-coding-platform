/**
 * 课时闯关页面 - Lesson
 * 功能：编程课时闯关的核心页面，包含题目描述、代码编辑器、
 * AI 助手（诊断/导师/审查/规划四模式）、运行结果展示、
 * 成就解锁、连击计数和庆祝特效等完整学习体验。
 */
import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getLesson, type LessonDetail } from '../api/lessons'
import { useCodeRunner } from '../hooks/useCodeRunner'
import { useComboStreak, StreakIndicator } from '../hooks/useComboStreak'
import CodeEditor from '../components/editor/CodeEditor'
import Button from '../components/ui/Button'
import AIChat from '../components/chat/AIChat'
import LessonStats from '../components/ui/LessonStats'
import AchievementToast from '../components/badge/AchievementToast'
import StarBadge from '../components/badge/StarBadge'
import CelebrationEffect from '../components/ui/CelebrationEffect'
import { renderMarkdown } from '../utils/markdown'
import PageTransition from '../components/ui/PageTransition'
import apiClient from '../api/client'
import RadarChart from '../components/RadarChart'

// 运行结果状态的配色方案：通过 / 错误 / 部分正确 / 超时
const STATUS_COLORS: Record<string, { border: string; bg: string; text: string; gradient: string }> = {
  accepted: { border: '#bbf7d0', bg: '#f0fdf4', text: '#16a34a', gradient: 'linear-gradient(135deg, rgba(34,197,94,0.05), rgba(34,197,94,0.01))' },
  error:   { border: '#fecaca', bg: '#fef2f2', text: '#dc2626', gradient: 'linear-gradient(135deg, rgba(239,68,68,0.04), rgba(239,68,68,0.01))' },
  wrong:   { border: '#fde68a', bg: '#fffbeb', text: '#d97706', gradient: 'linear-gradient(135deg, rgba(245,158,11,0.04), rgba(245,158,11,0.01))' },
  timeout: { border: '#fed7aa', bg: '#fff7ed', text: '#ea580c', gradient: 'linear-gradient(135deg, rgba(249,115,22,0.04), rgba(249,115,22,0.01))' },
}

/**
 * 课时闯关页面组件
 * 核心学习交互页面，包含代码编辑、AI 智能辅导、运行评测等
 */
export default function Lesson() {
  const { languageSlug, lessonId } = useParams<{ languageSlug: string; lessonId: string }>()
  const navigate = useNavigate()

  const [lesson, setLesson] = useState<LessonDetail | null>(null)
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showHint, setShowHint] = useState(false)
  const { isRunning, result, error, runCode } = useCodeRunner()
  const { streak, recordSuccess, recordFailure } = useComboStreak()
  const [unlockedAchievement, setUnlockedAchievement] = useState<{slug: string; name: string; rarity: string} | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [aiMode, setAiMode] = useState<'diagnostic' | 'tutor' | 'review' | 'plan'>('tutor')
  const [aiResponse, setAiResponse] = useState('')
  const [reviewScores, setReviewScores] = useState<{
  correctness: number
  readability: number
  performance: number
  robustness: number
} | null>(null)
  const [reviewIssues, setReviewIssues] = useState<Array<{
  line: number
  message: string
  severity: 'error' | 'warning' | 'info'
}>>([])
  const [aiLoading, setAiLoading] = useState(false)


  // 加载课时详情数据
  useEffect(() => {
    if (lessonId) {
      setIsLoading(true)
      getLesson(Number(lessonId))
        .then((data) => { setLesson(data); setCode(data.starter_code || data.best_code || '') })
        .catch((err) => console.error('Failed to load lesson:', err))
        .finally(() => setIsLoading(false))
    }
  }, [lessonId])

  // 根据运行结果推导状态类型
  const resultStatus = useMemo(() => {
    if (!result) return null
    if (result.status === 'accepted') return 'accepted'
    if (result.status === 'error') return 'error'
    if (result.score > 0) return 'wrong'
    return 'error'
  }, [result])

  /** 提交代码进行评测，处理结果状态和成就解锁 */
  const handleSubmit = async () => {
    if (!lessonId) return
    const submitResult = await runCode(Number(lessonId), code)
    if (!submitResult) return
    setLesson((prev) => prev ? { ...prev, attempts: prev.attempts + 1 } : prev)
    if (submitResult.score > 0) {
      recordSuccess()  // 记录成功连击
      if (submitResult.stars >= 4) setShowCelebration(true)  // 高分触发庆祝特效
      const achievements = submitResult.unlocked_achievements
      if (achievements.length > 0) setUnlockedAchievement(achievements[0])  // 显示新解锁的成就
    } else { recordFailure() }
  }

  /** 返回闯关地图，携带当前课时ID用于棋子动画 */
  const goBack = () => {
    navigate(`/${languageSlug}`, { state: lessonId ? { fromLessonId: Number(lessonId), ts: Date.now() } : undefined })
  }

  /** 调用 AI 接口执行当前模式（诊断/导师/审查/规划）的分析 */
  const handleAIAction = async () => {
    setAiLoading(true)
    setAiResponse('')
    try {
      const payload: any = { code, lesson_id: lessonId }
      const response = await apiClient.post(`/ai/${aiMode}`, payload, { timeout: 120000 })
      if (aiMode === 'review') {
        setAiResponse(response.data.overall || '审查完成')
        if (response.data.scores) setReviewScores(response.data.scores)
        if (response.data.issues) setReviewIssues(response.data.issues)
      } else {
        setAiResponse(response.data.response || 'AI 回复完成')
      }
    } catch (error) {
      console.error('AI 请求失败:', error)
      setAiResponse('AI 服务暂时不可用，请稍后再试')
    } finally {
      setAiLoading(false)
    }
  }

  if (isLoading) return <LessonSkeleton />
  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#fafbf8' }}>
        <p className="text-lg" style={{ color: '#64748b' }}>课程未找到</p>
      </div>
    )
  }

  const langColor = lesson.difficulty === 'beginner' ? '#16a34a' : lesson.difficulty === 'advanced' ? '#dc2626' : '#d97706'
  const statusCfg = resultStatus ? STATUS_COLORS[resultStatus] : null

  return (
    <PageTransition>
      <div className="h-screen flex flex-col" style={{ background: '#fafbf8' }}>
        <nav className="shrink-0 z-40 nav-glow" style={{ background: 'rgba(250,251,248,0.9)', backdropFilter: 'blur(24px)', borderBottom: '1px solid #e6e8e3' }}>
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <button onClick={goBack} className="text-sm shrink-0 transition-colors font-medium" style={{ color: '#64748b' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#1e293b' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#64748b' }}
              >← 返回地图</button>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold truncate" style={{ color: '#1e293b' }}>{lesson.title}</h1>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium" style={{ color: '#d97706' }}>+{lesson.xp_reward} XP</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: `${langColor}14`, color: langColor }}>
                    {lesson.difficulty === 'beginner' ? '入门' : lesson.difficulty === 'advanced' ? '高级' : '进阶'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm shrink-0" style={{ color: '#64748b' }}>
              <span>尝试次数: {lesson.attempts}</span>
              {lesson.best_score > 0 && <span style={{ color: '#16a34a' }}>最佳 {lesson.best_score}分</span>}
              {lessonId && <LessonStats lessonId={Number(lessonId)} />}
            </div>
          </div>
        </nav>

        <div className="flex-1 flex overflow-hidden">
          {/* 左侧：题目描述 */}
          <div className="w-1/2 border-r overflow-y-auto p-6" style={{ borderColor: '#e6e8e3' }}>
            <div className="prose max-w-none">
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(lesson.content || '') }} />
            </div>
            <div className="mt-6">
              <button onClick={() => setShowHint(!showHint)} className="text-sm transition-colors font-medium" style={{ color: '#d97706' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#b45309' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#d97706' }}
              >{showHint ? '隐藏提示' : '💡 查看提示'}</button>
              {showHint && lesson.hint && (
                <div className="mt-2 p-3.5 rounded-xl text-sm" style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>{lesson.hint}</div>
              )}
            </div>
          </div>

          {/* 右侧 */}
          <div className="w-1/2 flex flex-col overflow-y-auto">
            <div className="shrink-0 p-4" style={{ height: '45vh', minHeight: '280px' }}>
              <CodeEditor value={code} onChange={setCode} language={languageSlug || 'python'} height="100%" decorations={reviewIssues} />
            </div>

            {/* AI 模式切换 */}
            <div className="px-4 pt-2 flex items-center gap-2 shrink-0 flex-wrap" style={{ borderTop: '1px solid #e6e8e3' }}>
              <span className="text-xs mr-1" style={{ color: '#94a3b8' }}>🤖 AI 模式</span>
              {[
                { key: 'diagnostic', label: '诊断', icon: '🔍' },
                { key: 'tutor', label: '导师', icon: '🧑‍🏫' },
                { key: 'review', label: '审查', icon: '📋' },
                { key: 'plan', label: '规划', icon: '📈' },
              ].map((mode) => (
                <button key={mode.key} onClick={() => setAiMode(mode.key as any)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: aiMode === mode.key ? '#ecfdf5' : '#f8fafc',
                    border: aiMode === mode.key ? '1px solid #a7f3d0' : '1px solid transparent',
                    color: aiMode === mode.key ? '#059669' : '#94a3b8',
                  }}
                >{mode.icon} {mode.label}</button>
              ))}
            </div>

            {/* 按钮栏 */}
            <div className="px-4 py-3 flex items-center gap-3 shrink-0" style={{ borderTop: '1px solid #e6e8e3', background: 'rgba(250,251,248,0.6)' }}>
              <Button onClick={handleSubmit} isLoading={isRunning} size="sm">{isRunning ? '评测中...' : '▶ 运行代码'}</Button>
              <Button variant="secondary" size="sm" onClick={() => setCode(lesson.starter_code || '')}>重置</Button>
              <Button variant="secondary" size="sm" onClick={async () => {
                const title = prompt('收藏名称：', lesson.title || '代码片段')
                if (!title) return
                try {
                  const res = await apiClient.post('/snippets', { title, code, language: languageSlug || 'python', tags: [], lesson_id: Number(lessonId) })
                  alert(res.data?.message || '收藏成功')
                } catch (err: any) { alert('收藏失败: ' + (err?.response?.data?.detail || err?.message || '未知错误')) }
              }}>⭐ 收藏</Button>
              <span className="text-xs ml-auto" style={{ color: '#94a3b8' }}>{lesson.attempts} 次尝试</span>
              <StreakIndicator count={streak.count} best={streak.best} />
            </div>

            {/* AI 回复区域 */}
            <div className="px-4 py-3 shrink-0" style={{ borderTop: '1px solid #e6e8e3', background: 'rgba(250,251,248,0.3)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs" style={{ color: '#64748b' }}>
                  <span className="font-medium" style={{ color: '#818cf8' }}>
                    {aiMode === 'diagnostic' && '🔍 诊断模式'}
                    {aiMode === 'tutor' && '🧑‍🏫 导师模式'}
                    {aiMode === 'review' && '📋 审查模式'}
                    {aiMode === 'plan' && '📈 规划模式'}
                  </span>
                </div>
                <button
                  onClick={handleAIAction}
                  disabled={aiLoading}
                  className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: aiLoading ? 'rgba(99,102,241,0.05)' : 'rgba(99,102,241,0.15)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    color: aiLoading ? '#64748b' : '#a5b4fc',
                    cursor: aiLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {aiLoading ? '⏳ 分析中...' : '🚀 执行 AI 分析'}
                </button>
              </div>
              <div className="mt-2 text-sm" style={{ color: '#475569' }}>
                {aiResponse ? (
                  <div className="p-3 rounded-xl" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                    {aiMode === 'review' ? (
                      <div>
                        <div style={{ height: '220px', marginBottom: '12px' }}>{reviewScores && <RadarChart scores={reviewScores} />}</div>
                        {reviewScores && (
                          <div className="text-xs" style={{ color: '#475569' }}>
                            <div className="flex flex-wrap gap-3 mt-2">
                              <span>✅ 正确性: {reviewScores.correctness}分</span>
                              <span>📖 可读性: {reviewScores.readability}分</span>
                              <span>⚡ 性能: {reviewScores.performance}分</span>
                              <span>🛡️ 健壮性: {reviewScores.robustness}分</span>
                            </div>
                            {reviewIssues.length > 0 && <div className="mt-2" style={{ color: '#059669' }}>💡 建议：{reviewIssues.map(i => i.message).join('；')}</div>}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap" style={{ color: '#334155' }}>{aiResponse}</div>
                    )}
                  </div>
                ) : (
                  <div style={{ color: '#94a3b8' }}>
                    💡 点击「执行 AI 分析」按钮获取{' '}
                    {aiMode === 'diagnostic' ? '诊断' : aiMode === 'tutor' ? '导师指导' : aiMode === 'review' ? '代码审查' : '学习规划'} 建议
                  </div>
                )}
              </div>
            </div>

            {/* 结果区 */}
            {(result || error) && (
              <div className="p-4 shrink-0" style={{ borderTop: '1px solid #e6e8e3' }}>
                {error && (
                  <div className="rounded-xl p-3.5 text-sm mb-3" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                    {result?.error_type && (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mb-1.5" style={{ background: '#fee2e2', color: '#dc2626' }}>
                        {({ syntax: '语法错误', runtime: '运行时错误', timeout: '超时', logic: '逻辑错误' }[result.error_type] || '运行时错误')}
                      </span>
                    )}
                    <div className="whitespace-pre-wrap">{error}</div>
                  </div>
                )}

                {result && (
                  <div className="space-y-3">
                    <div className="rounded-xl p-4" style={{ background: statusCfg?.gradient || '#ffffff', border: `1px solid ${statusCfg?.border || '#e6e8e3'}` }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <StarBadge stars={result.stars} size="md" animated />
                          {result.stars >= 4 && <span className="text-xs font-medium" style={{ color: '#d97706' }}>{result.stars === 5 ? '完美通关' : '优秀代码'}</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          {result.xp_earned > 0 && (
                            <span className="font-mono text-xs px-2 py-0.5 rounded font-medium" style={{ color: '#b45309', background: '#fef3c7' }}>+{result.xp_earned} XP</span>
                          )}
                          <span className="font-mono text-sm tabular-nums" style={{ color: '#475569' }}>得分 {result.score}</span>
                        </div>
                      </div>

                      {result.ai_analysis && (
                        <div className="p-3.5 rounded-xl" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                          <div className="flex items-center gap-2 mb-2"><span style={{ color: '#059669' }}>🔬 AI 分析</span></div>
                          <div className="text-sm whitespace-pre-wrap" style={{ color: '#334155' }}>{result.ai_analysis}</div>
                        </div>
                      )}

                      {result.test_results && result.test_results.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          <span className="text-xs" style={{ color: '#94a3b8' }}>测试用例 · {result.test_results.filter(t => t.status === 'passed').length}/{result.test_results.length} 通过</span>
                          {result.test_results.map((tr) => (
                            <div key={tr.index} className="p-2.5 rounded-lg text-xs" style={{
                              background: tr.status === 'passed' ? '#f0fdf4' : tr.status === 'error' ? '#fff7ed' : '#fef2f2',
                              border: `1px solid ${tr.status === 'passed' ? '#bbf7d0' : tr.status === 'error' ? '#fed7aa' : '#fecaca'}`,
                            }}>
                              <div className="flex items-center gap-2">
                                <span>{tr.status === 'passed' ? '✓' : tr.status === 'error' ? '⚡' : '✗'}</span>
                                <span className="font-medium" style={{ color: '#334155' }}>{tr.description}</span>
                                {tr.error_type && tr.status !== 'passed' && (
                                  <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium" style={{
                                    background: tr.error_type === 'syntax' ? '#fee2e2' : tr.error_type === 'runtime' ? '#ffedd5' : tr.error_type === 'timeout' ? '#fef3c7' : '#fef9c3',
                                    color: tr.error_type === 'syntax' ? '#dc2626' : tr.error_type === 'runtime' ? '#ea580c' : tr.error_type === 'timeout' ? '#d97706' : '#ca8a04',
                                  }}>
                                    {({ syntax: '语法', runtime: '运行时', timeout: '超时', logic: '逻辑' }[tr.error_type] || '逻辑')}
                                  </span>
                                )}
                              </div>
                              {tr.status !== 'passed' && (
                                <div className="mt-1 pl-5" style={{ color: '#64748b' }}>
                                  <div>期望: {tr.expected}</div>
                                  <div>实际: {tr.actual}</div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {(result.stdout || result.stderr) && (
                        <div className="mt-2">
                          <span className="text-xs" style={{ color: '#94a3b8' }}>执行输出:</span>
                          <pre className="mt-1 rounded-lg p-2.5 text-xs overflow-x-auto" style={{ background: '#f4f6f1', color: result.status === 'error' ? '#dc2626' : '#334155' }}>
                            {result.stdout || ''}{result.stderr || ''}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <AIChat lessonId={Number(lessonId)} context={{ lesson_title: lesson.title, language: languageSlug, code, error: error || undefined }} />
        <AchievementToast achievement={unlockedAchievement} onClose={() => setUnlockedAchievement(null)} />
        <CelebrationEffect active={showCelebration} onComplete={() => setShowCelebration(false)} xpEarned={result?.xp_earned || 0} />
      </div>
    </PageTransition>
  )
}

function LessonSkeleton() {
  return (
    <div className="animate-pulse h-screen flex flex-col" style={{ background: '#fafbf8' }}>
      <nav style={{ background: 'rgba(250,251,248,0.9)', borderBottom: '1px solid #e6e8e3' }}>
        <div className="px-6 py-3 flex items-center gap-4">
          <div className="h-5 w-20 rounded skeleton-shimmer" />
          <div className="h-6 w-32 rounded skeleton-shimmer" />
        </div>
      </nav>
      <div className="flex-1 flex">
        <div className="w-1/2 p-6 space-y-3" style={{ borderRight: '1px solid #e6e8e3' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 rounded skeleton-shimmer" style={{ width: `${[85, 70, 90, 55, 75, 60][i]}%` }} />
          ))}
        </div>
        <div className="w-1/2 flex flex-col">
          <div className="flex-1 p-4"><div className="h-full rounded-xl skeleton-shimmer" /></div>
        </div>
      </div>
    </div>
  )
}
