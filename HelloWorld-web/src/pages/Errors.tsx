/**
 * 错题本页面 - Errors
 * 功能：展示用户在闯关中出错的题目记录，支持按错误类型筛选、
 * 展开查看详情（错误代码 + AI 分析）、标记已解决和重新挑战。
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import PageTransition from '../components/ui/PageTransition'
import { getErrors, resolveError, type ErrorItem, type ErrorStats } from '../api/errors'

// 错误类型的中文标签和颜色配置
const errorTypeMap: Record<string, { label: string; color: string; bg: string; border: string }> = {
  syntax:      { label: '语法错误', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  logic:       { label: '逻辑错误', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  boundary:    { label: '边界错误', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
  performance: { label: '性能问题', color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8' },
}

/**
 * 错题本页面组件
 * 展示和筛选用户的错误记录，支持重新挑战和标记已解决
 */
export default function Errors() {
  const navigate = useNavigate()
  const [errors, setErrors] = useState<ErrorItem[]>([])
  const [stats, setStats] = useState<ErrorStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [resolvingIds, setResolvingIds] = useState<Set<number>>(new Set())

  /** 根据筛选条件获取错题列表和统计数据 */
  const fetchErrors = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const params = filter !== 'all'
        ? { type: filter as ErrorItem['error_type'], resolved: false }
        : { resolved: false }
      const data = await getErrors(params)
      setErrors(data.errors)
      setStats(data.stats)
    } catch (err: any) {
      setLoadError(err?.response?.data?.detail || err?.message || '加载失败')
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  // 监听筛选条件变化，重新加载数据
  useEffect(() => { fetchErrors() }, [fetchErrors])

  /** 标记错题为已解决，从列表中移除并更新统计数据 */
  const handleResolve = async (errorId: number) => {
    setResolvingIds(prev => new Set(prev).add(errorId))
    try {
      await resolveError(errorId)
      setErrors(prev => prev.filter(e => e.id !== errorId))
      if (stats) {
        const resolvedItem = errors.find(e => e.id === errorId)
        if (resolvedItem) {
          setStats(prev => prev ? {
            ...prev,
            [resolvedItem.error_type]: Math.max(0, prev[resolvedItem.error_type] - 1)
          } : prev)
        }
      }
    } catch (err: any) {
      console.error('标记已解决失败:', err)
    } finally {
      setResolvingIds(prev => {
        const next = new Set(prev)
        next.delete(errorId)
        return next
      })
    }
  }

  const errorTypes = ['all', 'syntax', 'logic', 'boundary', 'performance']
  const totalCount = stats ? stats.syntax + stats.logic + stats.boundary + stats.performance : errors.length

  return (
    <PageTransition>
      <div className="min-h-screen" style={{ background: '#fafbf8' }}>
        {/* 导航栏 */}
        <nav className="sticky top-0 z-40 nav-glow" style={{ background: 'rgba(250,251,248,0.85)', backdropFilter: 'blur(24px)', borderBottom: '1px solid #e6e8e3' }}>
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="text-sm font-medium transition-colors"
                style={{ color: '#64748b' }}
                onMouseEnter={e => e.currentTarget.style.color = '#1e293b'}
                onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
              >
                ← 返回大厅
              </button>
              <h1 className="text-xl font-bold" style={{ color: '#1e293b' }}>错题本</h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#ecfdf5', color: '#059669' }}>
                {totalCount} 道
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
              const count = type === 'all' ? totalCount : stats?.[type as keyof ErrorStats] ?? 0
              return (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: isActive ? '#ecfdf5' : '#ffffff',
                    border: isActive ? '1px solid #a7f3d0' : '1px solid #e6e8e3',
                    color: isActive ? '#059669' : '#64748b',
                    boxShadow: isActive ? '0 1px 3px rgba(16,185,129,0.08)' : '0 1px 2px rgba(0,0,0,0.02)',
                  }}
                >
                  {label} {count > 0 && <span style={{ opacity: 0.5 }}>({count})</span>}
                </button>
              )
            })}
          </div>

          {/* 加载骨架屏 */}
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl p-4 skeleton-shimmer" style={{ background: '#ffffff', border: '1px solid #e6e8e3', height: 64 }} />
              ))}
            </div>
          )}

          {/* 加载错误 */}
          {!isLoading && loadError && (
            <div className="text-center py-16 rounded-2xl" style={{ background: '#ffffff', border: '1px solid #e6e8e3', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <p className="text-5xl mb-4">😵</p>
              <p className="text-lg mb-3" style={{ color: '#475569' }}>加载失败</p>
              <p className="text-sm mb-4" style={{ color: '#94a3b8' }}>{loadError}</p>
              <button
                onClick={fetchErrors}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all text-white"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                重试
              </button>
            </div>
          )}

          {/* 错题列表 */}
          {!isLoading && !loadError && (
            <>
              {errors.length === 0 ? (
                <div className="text-center py-16 rounded-2xl" style={{ background: '#ffffff', border: '1px solid #e6e8e3', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <p className="text-5xl mb-4">🎉</p>
                  <p className="text-lg font-medium" style={{ color: '#475569' }}>暂无错题，继续保持！</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {errors.map((error) => {
                    const isExpanded = expandedId === error.id
                    const typeInfo = errorTypeMap[error.error_type] || { label: error.error_type, color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' }
                    return (
                      <div
                        key={error.id}
                        className="rounded-xl overflow-hidden transition-all"
                        style={{
                          background: '#ffffff',
                          border: isExpanded ? '1.5px solid #a7f3d0' : '1px solid #e6e8e3',
                          boxShadow: isExpanded ? '0 2px 12px rgba(16,185,129,0.06)' : '0 1px 2px rgba(0,0,0,0.03)',
                        }}
                      >
                        <div
                          className="p-4 cursor-pointer flex items-center justify-between"
                          onClick={() => setExpandedId(isExpanded ? null : error.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: typeInfo.bg, color: typeInfo.color, border: `1px solid ${typeInfo.border}` }}>
                                {typeInfo.label}
                              </span>
                              <span className="font-medium" style={{ color: '#1e293b' }}>
                                关卡 #{error.lesson_id}
                              </span>
                            </div>
                            <div className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                              {new Date(error.created_at).toLocaleString('zh-CN')}
                            </div>
                          </div>
                          <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => navigate(`/python/${error.lesson_id}`)}
                              className="px-3 py-1 rounded-lg text-xs font-medium transition-all hover:-translate-y-0.5"
                              style={{ background: '#ecfdf5', color: '#059669' }}
                            >
                              重新挑战
                            </button>
                            <button
                              onClick={() => handleResolve(error.id)}
                              disabled={resolvingIds.has(error.id)}
                              className="px-3 py-1 rounded-lg text-xs font-medium transition-all hover:-translate-y-0.5 disabled:opacity-50"
                              style={{ background: '#f0fdf4', color: '#16a34a' }}
                            >
                              {resolvingIds.has(error.id) ? '...' : '✓ 已解决'}
                            </button>
                            <span style={{ color: '#94a3b8', fontSize: 12 }}>
                              {isExpanded ? '▼' : '▶'}
                            </span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-3">
                            <div className="rounded-lg overflow-hidden" style={{ background: '#f4f6f1' }}>
                              <pre className="p-3 text-xs overflow-x-auto" style={{ color: '#334155', fontFamily: 'monospace' }}>
                                {error.error_code}
                              </pre>
                            </div>
                            <div className="p-3 rounded-lg" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                              <div className="text-xs font-medium mb-1" style={{ color: '#059669' }}>🤖 AI 分析</div>
                              <div className="text-sm" style={{ color: '#475569' }}>{error.ai_analysis}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
