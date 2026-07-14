import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageTransition from '../components/ui/PageTransition'
import Button from '../components/ui/Button'

// Mock 诊断题目
const questions = [
  {
    id: 1,
    question: '以下哪个是 Python 中定义变量的正确方式？',
    options: ['var x = 10', 'int x = 10', 'x = 10', 'let x = 10'],
    correct: 2,
    knowledge: '变量'
  },
  {
    id: 2,
    question: 'Python 中 `if` 语句的正确语法是？',
    options: ['if x > 5:', 'if (x > 5)', 'if x > 5 {', 'if x > 5 then'],
    correct: 0,
    knowledge: '条件判断'
  },
  // ... 更多题目
]

export default function Diagnostic() {
  const navigate = useNavigate()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<any>(null)

  const currentQuestion = questions[currentIndex]
  const total = questions.length
  const selectedAnswer = answers[currentIndex]

  const handleSelect = (optionIndex: number) => {
    const newAnswers = [...answers]
    newAnswers[currentIndex] = optionIndex
    setAnswers(newAnswers)
  }

  const handleNext = () => {
    if (currentIndex < total - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleSubmit = async () => {
// 用 Mock 数据（暂时代替 API）
  setResult({
      mastered: ['变量', '条件判断'],
      weak: ['循环', '函数'],
      recommendedLevel: '关卡 3'
  })

// 🆕 标记诊断已完成
  localStorage.setItem('diagnostic_completed', 'true')
  setSubmitted(true)
  }  

  if (submitted && result) {
    return (
      <PageTransition>
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#080c17' }}>
          <div className="max-w-2xl w-full p-8 rounded-2xl" style={{ background: 'rgba(15,19,34,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h1 className="text-2xl font-bold mb-4" style={{ color: '#f1f5f9' }}>🎯 诊断结果</h1>
            <div className="space-y-3">
              <div><span style={{ color: '#4ade80' }}>✅ 已掌握：</span><span style={{ color: '#94a3b8' }}>{result.mastered.join('、')}</span></div>
              <div><span style={{ color: '#f87171' }}>⚠️ 薄弱点：</span><span style={{ color: '#94a3b8' }}>{result.weak.join('、')}</span></div>
              <div><span style={{ color: '#818cf8' }}>📌 推荐起点：</span><span style={{ color: '#fbbf24' }}>{result.recommendedLevel}</span></div>
            </div>
            <Button className="mt-6 w-full" onClick={() => navigate('/')}>开始学习</Button>
          </div>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080c17' }}>
        <div className="max-w-2xl w-full p-8 rounded-2xl" style={{ background: 'rgba(15,19,34,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex justify-between items-center mb-6">
            <span className="text-sm" style={{ color: '#64748b' }}>第 {currentIndex + 1} / {total} 题</span>
            <span className="text-sm" style={{ color: '#64748b' }}>进度 {Math.round((currentIndex + 1) / total * 100)}%</span>
          </div>

          <div className="h-1.5 w-full rounded-full mb-6" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(currentIndex + 1) / total * 100}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
          </div>

          <h2 className="text-lg font-medium mb-4" style={{ color: '#f1f5f9' }}>
            {currentQuestion.question}
          </h2>

          <div className="space-y-2.5">
            {currentQuestion.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                className="w-full text-left px-4 py-3 rounded-xl transition-all"
                style={{
                  background: selectedAnswer === idx ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                  border: selectedAnswer === idx ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.06)',
                  color: selectedAnswer === idx ? '#a5b4fc' : '#cbd5e1',
                }}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="flex gap-3 mt-6">
            <Button variant="secondary" onClick={handlePrev} disabled={currentIndex === 0} className="flex-1">
              上一题
            </Button>
            {currentIndex === total - 1 ? (
              <Button className="flex-1" onClick={handleSubmit} disabled={answers.length < total}>
                提交诊断
              </Button>
            ) : (
              <Button className="flex-1" onClick={handleNext} disabled={selectedAnswer === undefined}>
                下一题
              </Button>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  )
}