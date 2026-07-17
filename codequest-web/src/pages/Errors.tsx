import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageTransition from '../components/ui/PageTransition'

// 模拟错题数据
const mockErrors = [
  {
    id: 1,
    lesson_id: 3,
    lesson_title: '条件判断',
    error_type: 'logic',
    error_type_label: '逻辑错误',
    code: 'if x > 5:\n    print("大于5")\nelse:\n    print("小于等于5")',
    ai_analysis: '你的条件判断逻辑有问题，当 x=5 时应该输出"等于5"，但你的代码会输出"小于等于5"。建议增加等于情况的处理。',
    created_at: '2026-07-14 10:30:00',
    language: 'python'
  },
  {
    id: 2,
    lesson_id: 5,
    lesson_title: '循环',
    error_type: 'syntax',
    error_type_label: '语法错误',
    code: 'for i in range(10)\n    print(i)',
    ai_analysis: 'for 循环后面缺少冒号 :，Python 语法要求循环语句以冒号结尾。',
    created_at: '2026-07-13 15:20:00',
    language: 'python'
  },
  {
    id: 3,
    lesson_id: 8,
    lesson_title: '列表操作',
    error_type: 'boundary',
    error_type_label: '边界错误',
    code: 'def get_element(lst, index):\n    return lst[index]',
    ai_analysis: '没有检查 index 是否超出列表范围。当 index 超出长度时会抛出 IndexError。建议增加边界检查。',
    created_at: '2026-07-12 09:15:00',
    language: 'python'
  }
]

const errorTypeMap: Record<string, { label: string; color: string; bg: string }> = {
  syntax: { label: '语法错误', color: '#f87171', bg: 'rgba(239,68,68,0.12)' },
  logic: { label: '逻辑错误', color: '#fbbf24', bg: 'rgba(245,158,11,0.12)' },
  boundary: { label: '边界错误', color: '#fb923c', bg: 'rgba(249,115,22,0.12)' },
  performance: { label: '性能问题', color: '#f472b6', bg: 'rgba(244,114,182,0.12)' },
}

export default function Errors() {
  const navigate = useNavigate()
  const [errors] = useState(mockErrors)
  const [filter, setFilter] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // TODO: 接入真实 API
  // useEffect(() => {
  //   apiClient.get('/api/errors').then(res => setErrors(res.data))
  // }, [])

  const filteredErrors = filter === 'all' 
    ? errors 
    : errors.filter(e => e.error_type === filter)

  const errorTypes = ['all', 'syntax', 'logic', 'boundary', 'performance']

  return (
    <PageTransition>
      <div className="min-h-screen" style={{ background: '#080c17' }}>
        {/* 导航栏 */}
        <nav className="sticky top-0 z-40 border-b border-white/[0.04] nav-glow" style={{ background: 'rgba(8,12,23,0.85)', backdropFilter: 'blur(24px)' }}>
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/')}
                className="text-sm transition-colors"
                style={{ color: '#94a3b8' }}
                onMouseEnter={e => e.currentTarget.style.color = '#e2e8f0'}
                onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
              >
                ← 返回大厅
              </button>
              <h1 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>错题本</h1>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                {errors.length} 道
              </span>
            </div>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* 筛选栏 */}
          <div className="flex flex-wrap gap-2 mb-6">
            {errorTypes.map((type) => {
              const isActive = filter === type
              const label = type === 'all' ? '全部' : errorTypeMap[type]?.label || type
              return (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: isActive ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                    border: isActive ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.06)',
                    color: isActive ? '#a5b4fc' : '#94a3b8',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* 错题列表 */}
          {filteredErrors.length === 0 ? (
            <div className="text-center py-16 rounded-2xl" style={{ background: 'rgba(15,19,34,0.6)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <p className="text-5xl mb-4">🎉</p>
              <p className="text-lg" style={{ color: '#94a3b8' }}>暂无错题，继续保持！</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredErrors.map((error) => {
                const isExpanded = expandedId === error.id
                const typeInfo = errorTypeMap[error.error_type] || { label: error.error_type, color: '#94a3b8', bg: 'rgba(255,255,255,0.04)' }
                return (
                  <div
                    key={error.id}
                    className="rounded-xl overflow-hidden transition-all"
                    style={{ 
                      background: 'rgba(15,19,34,0.6)', 
                      border: isExpanded ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <div 
                      className="p-4 cursor-pointer flex items-center justify-between"
                      onClick={() => setExpandedId(isExpanded ? null : error.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <span 
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: typeInfo.bg, color: typeInfo.color }}
                          >
                            {typeInfo.label}
                          </span>
                          <span className="font-medium" style={{ color: '#e2e8f0' }}>
                            {error.lesson_title}
                          </span>
                        </div>
                        <div className="text-xs mt-1" style={{ color: '#475569' }}>
                          {error.created_at} · {error.language}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/${error.language}/${error.lesson_id}`)
                          }}
                          className="px-3 py-1 rounded-lg text-xs font-medium transition-all hover:scale-105"
                          style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}
                        >
                          重新挑战
                        </button>
                        <span style={{ color: '#475569', fontSize: 12 }}>
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3">
                        <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
                          <pre className="p-3 text-xs overflow-x-auto" style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>
                            {error.code}
                          </pre>
                        </div>
                        <div className="p-3 rounded-lg" style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.08)' }}>
                          <div className="text-xs font-medium mb-1" style={{ color: '#818cf8' }}>🤖 AI 分析</div>
                          <div className="text-sm" style={{ color: '#94a3b8' }}>{error.ai_analysis}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  )
}