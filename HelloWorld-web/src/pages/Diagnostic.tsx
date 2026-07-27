import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import PageTransition from '../components/ui/PageTransition'
import Button from '../components/ui/Button'
import apiClient from '../api/client'

interface Question {
  id: number
  question: string
  options: string[]
  tag: string
}

interface AnswerItem {
  question_id: number
  answer: string
}

interface DiagnosticResult {
  score: number
  skill_level: string
  correct_tags: string[]
  weak_tags: string[]
  recommended_start: string
  message: string
}

function extractLetter(option: string): string {
  const match = option.match(/^([A-D])[.）\)、\s]/)
  return match ? match[1] : option.charAt(0)
}

export default function Diagnostic() {
  const navigate = useNavigate()
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<AnswerItem[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<DiagnosticResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    apiClient.get('/diagnostic/questions')
      .then(res => {
        const qs: Question[] = (res.data.questions || []).map((q: any) => ({
          id: q.id,
          question: q.question,
          options: q.options || [],
          tag: q.tag || '',
        }))
        setQuestions(qs)
        setAnswers(new Array(qs.length).fill(null).map(() => ({ question_id: 0, answer: '' })))
      })
      .catch(() => setLoadError('无法加载诊断题目，请检查网络连接'))
      .finally(() => setLoading(false))
  }, [])

  const currentQuestion = questions[currentIndex]
  const total = questions.length
  const currentAnswer = answers[currentIndex]
  const selectedLetter = currentAnswer?.answer || ''
  const allAnswered = answers.every(a => a.answer !== '')

  const handleSelect = useCallback((optionText: string) => {
    const letter = extractLetter(optionText)
    setAnswers(prev => {
      const next = [...prev]
      next[currentIndex] = { question_id: currentQuestion.id, answer: letter }
      return next
    })
  }, [currentIndex, currentQuestion])

  const handleNext = () => { if (currentIndex < total - 1) setCurrentIndex(currentIndex + 1) }
  const handlePrev = () => { if (currentIndex > 0) setCurrentIndex(currentIndex - 1) }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const payload = { answers: answers.filter(a => a.answer !== '') }
      const response = await apiClient.post('/diagnostic/submit', payload)
      const data = response.data
      setResult({
        score: data.score,
        skill_level: data.skill_level || 'beginner',
        correct_tags: data.correct_tags || [],
        weak_tags: data.weak_tags || [],
        recommended_start: data.recommended_start || '',
        message: data.message || '',
      })
      localStorage.setItem('diagnostic_completed', 'true')
      setSubmitted(true)
    } catch {
      setResult({
        score: 0,
        skill_level: 'beginner',
        correct_tags: [],
        weak_tags: [],
        recommended_start: '',
        message: '提交失败，请稍后重试',
      })
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#fafbf8' }}>
          <div className="text-center">
            <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#e6e8e3', borderTopColor: '#10b981' }} />
            <p style={{ color: '#64748b' }}>加载诊断题目...</p>
          </div>
        </div>
      </PageTransition>
    )
  }

  if (loadError) {
    return (
      <PageTransition>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#fafbf8' }}>
          <p className="text-5xl">😵</p>
          <p style={{ color: '#64748b' }}>{loadError}</p>
          <Button onClick={() => window.location.reload()}>重试</Button>
        </div>
      </PageTransition>
    )
  }

  if (submitted && result) {
    return (
      <PageTransition>
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #ecfdf5 0%, #fafbf8 45%)' }}>
          <div className="max-w-2xl w-full mx-4 p-8 rounded-2xl" style={{ background: '#ffffff', border: '1px solid #e6e8e3', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <div className="text-center mb-6">
              <span className="text-5xl block mb-3">
                {result.score >= 80 ? '🌟' : result.score >= 50 ? '💪' : '🌱'}
              </span>
              <h1 className="text-2xl font-bold" style={{ color: '#1e293b' }}>诊断完成</h1>
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                <span className="text-2xl font-extrabold" style={{ color: '#059669' }}>{result.score}</span>
                <span className="text-sm" style={{ color: '#059669' }}>/ 100 分</span>
              </div>
            </div>

            <div className="space-y-4 mt-6">
              <div className="p-4 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e6e8e3' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span>📌</span>
                  <span className="font-medium text-sm" style={{ color: '#1e293b' }}>能力等级</span>
                </div>
                <span className="px-3 py-1 rounded-full text-sm font-medium" style={{
                  background: result.skill_level === 'beginner' ? '#fef3c7' : result.skill_level === 'intermediate' ? '#ecfdf5' : '#f0fdf4',
                  color: result.skill_level === 'beginner' ? '#d97706' : result.skill_level === 'intermediate' ? '#059669' : '#16a34a',
                }}>
                  {result.skill_level === 'beginner' ? '入门' : result.skill_level === 'intermediate' ? '进阶' : '高级'}
                </span>
              </div>

              {result.correct_tags.length > 0 && (
                <div className="p-4 rounded-xl" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span>✅</span>
                    <span className="font-medium text-sm" style={{ color: '#16a34a' }}>已掌握的知识点</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.correct_tags.map(tag => (
                      <span key={tag} className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: '#dcfce7', color: '#15803d' }}>{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {result.weak_tags.length > 0 && (
                <div className="p-4 rounded-xl" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span>⚠️</span>
                    <span className="font-medium text-sm" style={{ color: '#dc2626' }}>薄弱知识点</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.weak_tags.map(tag => (
                      <span key={tag} className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: '#fee2e2', color: '#b91c1c' }}>{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {result.message && (
                <div className="p-4 rounded-xl text-sm" style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
                  💡 {result.message}
                </div>
              )}
            </div>

            <Button className="mt-6 w-full" onClick={() => navigate('/')}>开始学习 →</Button>
          </div>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #ecfdf5 0%, #fafbf8 45%)' }}>
        <div className="max-w-2xl w-full mx-4 p-8 rounded-2xl" style={{ background: '#ffffff', border: '1px solid #e6e8e3', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          {/* 顶部信息 */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🧠</span>
              <h1 className="text-lg font-bold" style={{ color: '#1e293b' }}>能力诊断</h1>
            </div>
            <span className="text-sm" style={{ color: '#94a3b8' }}>
              {currentIndex + 1} / {total}
            </span>
          </div>

          {/* 进度条 */}
          <div className="h-1.5 w-full rounded-full mb-6" style={{ background: '#f0f2ed' }}>
            <div className="h-full rounded-full transition-all duration-300" style={{
              width: `${((currentIndex + 1) / total) * 100}%`,
              background: 'linear-gradient(90deg, #10b981, #34d399)',
            }} />
          </div>

          {/* 知识点标签 */}
          {currentQuestion?.tag && (
            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-3" style={{ background: '#ecfdf5', color: '#059669' }}>
              {currentQuestion.tag}
            </span>
          )}

          {/* 题目 */}
          <h2 className="text-lg font-medium mb-5" style={{ color: '#1e293b' }}>{currentQuestion?.question}</h2>

          {/* 选项 */}
          {currentQuestion && (
            <div className="space-y-2.5">
              {currentQuestion.options.map((option, idx) => {
                const letter = extractLetter(option)
                const isSelected = selectedLetter === letter
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelect(option)}
                    className="w-full text-left px-4 py-3 rounded-xl transition-all duration-200"
                    style={{
                      background: isSelected ? '#ecfdf5' : '#f8fafc',
                      border: isSelected ? '1.5px solid #a7f3d0' : '1px solid #e6e8e3',
                      color: isSelected ? '#059669' : '#334155',
                      boxShadow: isSelected ? '0 1px 4px rgba(16,185,129,0.1)' : 'none',
                    }}
                  >
                    <span className="font-medium">{letter}.</span>{' '}
                    <span>{option.replace(/^[A-D][.）\)、\s]+\s*/, '')}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* 导航按钮 */}
          <div className="flex gap-3 mt-6">
            <Button variant="secondary" onClick={handlePrev} disabled={currentIndex === 0} className="flex-1">
              上一题
            </Button>
            {currentIndex === total - 1 ? (
              <Button className="flex-1" onClick={handleSubmit} disabled={!allAnswered || submitting}>
                {submitting ? '提交中...' : '提交诊断'}
              </Button>
            ) : (
              <Button className="flex-1" onClick={handleNext} disabled={!selectedLetter}>
                下一题
              </Button>
            )}
          </div>

          {/* 答题进度指示 */}
          <div className="flex justify-center gap-1.5 mt-6">
            {answers.map((a, i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-full transition-all" style={{
                background: a.answer ? '#10b981' : i === currentIndex ? '#f59e0b' : '#e6e8e3',
                transform: i === currentIndex ? 'scale(1.3)' : 'scale(1)',
              }} />
            ))}
          </div>

          {/* 已答题数 */}
          <p className="text-center text-xs mt-3" style={{ color: '#94a3b8' }}>
            已答 {answers.filter(a => a.answer !== '').length} / {total} 题
          </p>
        </div>
      </div>
    </PageTransition>
  )
}
