import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getLesson, type LessonDetail } from '../api/lessons'
import apiClient from '../api/client'
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

const STATUS_COLORS: Record<string, { border: string; bg: string; text: string; gradient: string }> = {
  accepted: { border: 'rgba(34,197,94,0.25)', bg: 'rgba(34,197,94,0.05)', text: '#4ade80', gradient: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.02))' },
  error:   { border: 'rgba(239,68,68,0.2)', bg: 'rgba(239,68,68,0.05)', text: '#f87171', gradient: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.02))' },
  wrong:   { border: 'rgba(245,158,11,0.2)', bg: 'rgba(245,158,11,0.04)', text: '#fbbf24', gradient: 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(245,158,11,0.02))' },
  timeout: { border: 'rgba(249,115,22,0.2)', bg: 'rgba(249,115,22,0.04)', text: '#fb923c', gradient: 'linear-gradient(135deg, rgba(249,115,22,0.06), rgba(249,115,22,0.02))' },
}

export default function Lesson() {
  const { languageSlug, lessonId } = useParams<{ languageSlug: string; lessonId: string }>()
  const navigate = useNavigate()

  const [lesson, setLesson] = useState<LessonDetail | null>(null)
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showHint, setShowHint] = useState(false)
  const { isRunning, result, error, runCode } = useCodeRunner()
  const { streak, recordSuccess, recordFailure } = useComboStreak()
  const [unlockedAchievement, setUnlockedAchievement] = useState<{
    slug: string; name: string; rarity: string
  } | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [aiMode, setAiMode] = useState<'diagnostic' | 'tutor' | 'review' | 'plan'>('tutor')
  const [aiResponse, setAiResponse] = useState('')

  useEffect(() => {
    if (lessonId) {
      setIsLoading(true)
      getLesson(Number(lessonId))
        .then((data) => {
          setLesson(data)
          setCode(data.starter_code || data.best_code || '')
        })
        .catch((err) => console.error('Failed to load lesson:', err))
        .finally(() => setIsLoading(false))
    }
  }, [lessonId])

  const resultStatus = useMemo(() => {
    if (!result) return null
    if (result.status === 'accepted') return 'accepted'
    if (result.status === 'error') return 'error'
    if (result.score > 0) return 'wrong'
    return 'error'
  }, [result])

  const handleSubmit = async () => {
    if (!lessonId) return
    const submitResult = await runCode(Number(lessonId), code)
    if (!submitResult) return

    // 提交后立即更新尝试次数
    setLesson((prev) => prev ? { ...prev, attempts: prev.attempts + 1 } : prev)

    if (submitResult.score > 0) {
      recordSuccess()
      if (submitResult.stars >= 4) setShowCelebration(true)
      const achievements = submitResult.unlocked_achievements
      if (achievements.length > 0) setUnlockedAchievement(achievements[0])
    } else {
      recordFailure()
    }
  }

  const goBack = () => {
    navigate(`/${languageSlug}`, {
      state: lessonId ? { fromLessonId: Number(lessonId), ts: Date.now() } : undefined,
    })
  }

  const handleAIAction = () => {
  const mockResponses = {
    diagnostic: '🔍 诊断结果：\n• 代码语法正确\n• 建议增加边界条件处理\n• 变量命名可以更清晰',
    tutor: '🧑‍🏫 导师建议：\n这个问题可以用循环来解决。\n试试这样想：\n1. 先确定循环条件\n2. 再处理每次迭代的逻辑',
    review: '📋 代码审查评分：\n• 正确性: 85分\n• 可读性: 70分\n• 性能: 75分\n• 健壮性: 60分\n建议：增加空值检查',
    plan: '📈 学习规划：\n基于你的进度，推荐学习：\n1. 下一关：循环嵌套\n2. 本周目标：完成函数章节\n3. 建议每天练习30分钟',
  }
  setAiResponse(mockResponses[aiMode] || '请选择有效模式')
}

  if (isLoading) return <LessonSkeleton />

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080c17' }}>
        <p className="text-lg" style={{ color: '#94a3b8' }}>课程未找到</p>
      </div>
    )
  }

  const langColor = lesson.difficulty === 'beginner' ? '#22c55e' : lesson.difficulty === 'advanced' ? '#ef4444' : '#f59e0b'
  const statusCfg = resultStatus ? STATUS_COLORS[resultStatus] : null

  return (
    <PageTransition>
      <div className="h-screen flex flex-col" style={{ background: '#080c17' }}>
        <nav
          className="shrink-0 z-40 nav-glow"
          style={{ background: 'rgba(8,12,23,0.9)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
        >
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <button
                onClick={goBack}
                className="text-sm shrink-0 transition-colors"
                style={{ color: '#94a3b8' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#e2e8f0' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8' }}
              >
                ← 返回地图
              </button>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold truncate" style={{ color: '#f1f5f9' }}>
                  {lesson.title}
                </h1>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: '#f59e0b' }}>+{lesson.xp_reward} XP</span>
                  <span
                    className="text-[11px] px-1.5 py-0.5 rounded-full"
                    style={{ background: `${langColor}15`, color: langColor }}
                  >
                    {lesson.difficulty === 'beginner' ? '入门' : lesson.difficulty === 'advanced' ? '高级' : '进阶'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm shrink-0" style={{ color: '#94a3b8' }}>
              <span>尝试次数: {lesson.attempts}</span>
              {lesson.best_score > 0 && (
                <span style={{ color: '#22c55e' }}>最佳 {lesson.best_score}分</span>
              )}
              {lessonId && <LessonStats lessonId={Number(lessonId)} />}
            </div>
          </div>
        </nav>

        <div className="flex-1 flex overflow-hidden">
          {/* 左侧：题目描述 */}
          <div className="w-1/2 border-r overflow-y-auto p-6" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            <div className="prose max-w-none">
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(lesson.content || '') }} />
            </div>
            <div className="mt-6">
              <button
                onClick={() => setShowHint(!showHint)}
                className="text-sm transition-colors"
                style={{ color: '#f59e0b' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#fbbf24' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#f59e0b' }}
              >
                {showHint ? '隐藏提示' : '💡 查看提示'}
              </button>
              {showHint && lesson.hint && (
                <div
                  className="mt-2 p-3.5 rounded-xl text-sm"
                  style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', color: '#fcd34d' }}
                >
                  {lesson.hint}
                </div>
              )}
            </div>
          </div>

          {/* 右侧：编辑器 + 按钮 + AI 回复 + 结果 */}
          <div className="w-1/2 flex flex-col">
            {/* 代码编辑器 */}
            <div className="flex-1 p-4 min-h-0">
              <CodeEditor value={code} onChange={setCode} language={languageSlug || 'python'} height="100%" />
            </div>

            {/* AI 模式切换按钮 */}
            <div className="px-4 pt-2 flex items-center gap-2 shrink-0 flex-wrap" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <span className="text-xs mr-1" style={{ color: '#64748b' }}>🤖 AI 模式</span>
              {[
                { key: 'diagnostic', label: '诊断', icon: '🔍' },
                { key: 'tutor', label: '导师', icon: '🧑‍🏫' },
                { key: 'review', label: '审查', icon: '📋' },
                { key: 'plan', label: '规划', icon: '📈' },
              ].map((mode) => (
                <button
                  key={mode.key}
                  onClick={() => setAiMode(mode.key as any)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: aiMode === mode.key ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
                    border: aiMode === mode.key ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
                    color: aiMode === mode.key ? '#a5b4fc' : '#94a3b8',
                  }}
                >
                  {mode.icon} {mode.label}
                </button>
              ))}
            </div>

            {/* 原有按钮栏：运行 / 重置 / 收藏 */}
            <div
              className="px-4 py-3 flex items-center gap-3 shrink-0"
              style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(8,12,23,0.6)' }}
            >
              <Button onClick={handleSubmit} isLoading={isRunning} size="sm">
                {isRunning ? '评测中...' : '▶ 运行代码'}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setCode(lesson.starter_code || '')}>
                重置
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  const title = prompt('收藏名称：', lesson.title || '代码片段')
                  if (!title) return
                  try {
                    const res = await apiClient.post('/snippets', {
                      title, code, language: languageSlug || 'python',
                      tags: [], lesson_id: Number(lessonId)
                    })
                    alert(res.data?.message || '收藏成功')
                  } catch (err: any) {
                    alert('收藏失败: ' + (err?.response?.data?.detail || err?.message || '未知错误'))
                  }
                }}
              >
                ⭐ 收藏
              </Button>
              <span className="text-xs ml-auto" style={{ color: '#475569' }}>
                {lesson.attempts} 次尝试
              </span>
              <StreakIndicator count={streak.count} best={streak.best} />
            </div>

            {/* 🆕 AI 回复区域 */}
            <div
              className="px-4 py-3 shrink-0"
              style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(8,12,23,0.3)' }}
            >
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
                  className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: 'rgba(99,102,241,0.15)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    color: '#a5b4fc',
                  }}
                >
                  🚀 执行 AI 分析
                </button>
              </div>
              <div className="mt-2 text-sm" style={{ color: '#94a3b8' }}>
                {aiResponse ? (
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)' }}>
                    <div className="whitespace-pre-wrap" style={{ color: '#cbd5e1' }}>
                      {aiResponse}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#475569' }}>💡 点击「执行 AI 分析」按钮获取 {aiMode === 'diagnostic' ? '诊断' : aiMode === 'tutor' ? '导师指导' : aiMode === 'review' ? '代码审查' : '学习规划'} 建议</div>
                )}
              </div>
            </div>

            {/* 原有的结果显示区 */}
            {(result || error) && (
              <div
                className="p-4 max-h-72 overflow-y-auto shrink-0"
                style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
              >
                {error && (
                  <div
                    className="rounded-xl p-3.5 text-sm mb-3"
                    style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.03))', border: '1px solid rgba(239,68,68,0.18)', color: '#fca5a5' }}
                  >
                    {result?.error_type && (
                      <span
                        className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mb-1.5"
                        style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}
                      >
                        {({ syntax: '语法错误', runtime: '运行时错误', timeout: '超时', logic: '逻辑错误' }[result.error_type] || '运行时错误')}
                      </span>
                    )}
                    <div className="whitespace-pre-wrap">{error}</div>
                  </div>
                )}

                {result && (
                  <div className="space-y-3">
                    <div
                      className="rounded-xl p-4 backdrop-blur-sm"
                      style={{
                        background: statusCfg?.gradient || 'rgba(15,19,34,0.6)',
                        border: `1px solid ${statusCfg?.border || 'rgba(255,255,255,0.06)'}`,
                        boxShadow: statusCfg ? `inset 0 1px 0 ${statusCfg.border}` : 'none',
                      }}
                    >
                      {/* 星级和得分 */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <StarBadge stars={result.stars} size="md" animated />
                          {result.stars >= 4 && (
                            <span className="text-xs" style={{ color: '#fbbf24' }}>
                              {result.stars === 5 ? '完美通关' : '优秀代码'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {result.xp_earned > 0 && (
                            <span
                              className="font-mono text-xs"
                              style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.08)', padding: '2px 8px', borderRadius: 4 }}
                            >
                              +{result.xp_earned} XP
                            </span>
                          )}
                          <span className="font-mono text-sm tabular-nums" style={{ color: '#94a3b8' }}>
                            得分 {result.score}
                          </span>
                        </div>
                      </div>

                      {/* AI 分析（原有的） */}
                      {result.ai_analysis && (
                        <div
                          className="p-3.5 rounded-xl"
                          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(99,102,241,0.03))', border: '1px solid rgba(99,102,241,0.18)', boxShadow: '0 0 20px rgba(99,102,241,0.06)' }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span style={{ color: '#818cf8' }}>🔬 AI 分析</span>
                          </div>
                          <div className="text-sm whitespace-pre-wrap" style={{ color: '#a5b4fc' }}>
                            {result.ai_analysis}
                          </div>
                        </div>
                      )}

                      {/* 测试结果 */}
                      {result.test_results && result.test_results.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          <span className="text-xs" style={{ color: '#64748b' }}>
                            测试用例 · {result.test_results.filter(t => t.status === 'passed').length}/{result.test_results.length} 通过
                          </span>
                          {result.test_results.map((tr) => (
                            <div
                              key={tr.index}
                              className="p-2.5 rounded-lg text-xs"
                              style={{
                                background: tr.status === 'passed' ? 'rgba(34,197,94,0.04)' :
                                  tr.status === 'error' ? 'rgba(249,115,22,0.04)' :
                                  'rgba(239,68,68,0.03)',
                                border: `1px solid ${
                                  tr.status === 'passed' ? 'rgba(34,197,94,0.12)' :
                                  tr.status === 'error' ? 'rgba(249,115,22,0.12)' :
                                  'rgba(239,68,68,0.08)'}`,
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <span>{tr.status === 'passed' ? '✓' : tr.status === 'error' ? '⚡' : '✗'}</span>
                                <span className="font-medium" style={{ color: '#cbd5e1' }}>{tr.description}</span>
                                {tr.error_type && tr.status !== 'passed' && (
                                  <span
                                    className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium"
                                    style={{
                                      background: tr.error_type === 'syntax' ? 'rgba(239,68,68,0.12)' :
                                        tr.error_type === 'runtime' ? 'rgba(249,115,22,0.12)' :
                                        tr.error_type === 'timeout' ? 'rgba(245,158,11,0.12)' :
                                        'rgba(234,179,8,0.12)',
                                      color: tr.error_type === 'syntax' ? '#fca5a5' :
                                        tr.error_type === 'runtime' ? '#fdba74' :
                                        tr.error_type === 'timeout' ? '#fcd34d' :
                                        '#fde047',
                                    }}
                                  >
                                    {({ syntax: '语法', runtime: '运行时', timeout: '超时', logic: '逻辑' }[tr.error_type] || '逻辑')}
                                  </span>
                                )}
                              </div>
                              {tr.status !== 'passed' && (
                                <div className="mt-1 pl-5" style={{ color: '#94a3b8' }}>
                                  <div>期望: {tr.expected}</div>
                                  <div>实际: {tr.actual}</div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 控制台输出 */}
                      {(result.stdout || result.stderr) && (
                        <div className="mt-2">
                          <span className="text-xs" style={{ color: '#64748b' }}>执行输出:</span>
                          <pre className="mt-1 rounded-lg p-2.5 text-xs overflow-x-auto" style={{ background: 'rgba(0,0,0,0.2)', color: result.status === 'error' ? '#fca5a5' : '#cbd5e1' }}>
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

        <AIChat lessonId={Number(lessonId)} context={{ lesson_title: lesson.title, code, error: error || undefined }} />
        <AchievementToast achievement={unlockedAchievement} onClose={() => setUnlockedAchievement(null)} />
        <CelebrationEffect
          active={showCelebration}
          onComplete={() => setShowCelebration(false)}
          xpEarned={result?.xp_earned || 0}
        />
      </div>
    </PageTransition>
  )
}
function LessonSkeleton() {
  return (
    <div className="animate-pulse h-screen flex flex-col" style={{ background: '#080c17' }}>
      <nav style={{ background: 'rgba(8,12,23,0.9)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="px-6 py-3 flex items-center gap-4">
          <div className="h-5 w-20 rounded skeleton-shimmer" />
          <div className="h-6 w-32 rounded skeleton-shimmer" />
        </div>
      </nav>
      <div className="flex-1 flex">
        <div className="w-1/2 p-6 space-y-3" style={{ borderRight: '1px solid rgba(255,255,255,0.04)' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 rounded skeleton-shimmer" style={{ width: `${[85, 70, 90, 55, 75, 60][i]}%` }} />
          ))}
        </div>
        <div className="w-1/2 flex flex-col">
          <div className="flex-1 p-4">
            <div className="h-full rounded-xl skeleton-shimmer" />
          </div>
        </div>
      </div>
    </div>
  )
}


