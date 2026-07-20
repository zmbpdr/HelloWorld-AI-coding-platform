import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getAgentNode, type AgentNodeDetail } from '../api/agent'
import { useAgentRunner } from '../hooks/useAgentRunner'
import CodeEditor from '../components/editor/CodeEditor'
import Button from '../components/ui/Button'
import AIChat from '../components/chat/AIChat'
import { renderMarkdown } from '../utils/markdown'
import PageTransition from '../components/ui/PageTransition'

const TRACK_CONFIG: Record<string, { name: string; color: string }> = {
  ml: { name: '机器学习', color: '#14b8a6' }, agent: { name: 'Agent开发', color: '#6366f1' },
  llm: { name: '大模型应用', color: '#ec4899' }, project: { name: '综合项目', color: '#f59e0b' },
}

function EnergyBar({ label, value, color }: { label: string; value: number; color: string }) {
  const percent = Math.min(100, Math.max(0, value))
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-14 shrink-0" style={{ color: '#64748b' }}>{label}</span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#f0f2ed' }}>
        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${percent}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }} />
      </div>
      <span className="text-xs font-mono w-10 text-right tabular-nums" style={{ color }}>{percent}%</span>
    </div>
  )
}

function EnergyRating({ detail, totalScore }: { detail: { understanding: number; implementation: number; optimization: number; creativity: number }; totalScore: number }) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#f8fafc', border: '1px solid #e6e8e3' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold" style={{ color: '#1e293b' }}>能量评级</span>
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => <span key={i} className="text-sm" style={{ color: i < totalScore ? '#f59e0b' : '#e2e8f0' }}>⚡</span>)}
          <span className="text-xs ml-1 font-medium" style={{ color: '#d97706' }}>{totalScore}级</span>
        </div>
      </div>
      <div className="space-y-2.5">
        <EnergyBar label="理解度" value={detail.understanding} color="#6366f1" />
        <EnergyBar label="实现度" value={detail.implementation} color="#14b8a6" />
        <EnergyBar label="优化度" value={detail.optimization} color="#ec4899" />
        <EnergyBar label="创新度" value={detail.creativity} color="#f59e0b" />
      </div>
    </div>
  )
}

export default function AgentLesson() {
  const { nodeId } = useParams<{ nodeId: string }>()
  const navigate = useNavigate()
  const [node, setNode] = useState<AgentNodeDetail | null>(null)
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showHint, setShowHint] = useState(false)
  const { isRunning, result, error, runCode } = useAgentRunner()

  useEffect(() => {
    if (nodeId) {
      setIsLoading(true)
      getAgentNode(Number(nodeId)).then(data => { setNode(data); setCode(data.starter_code || '') })
        .catch(err => console.error('Failed to load agent node:', err)).finally(() => setIsLoading(false))
    }
  }, [nodeId])

  const resultStatus = useMemo(() => {
    if (!result) return null; if (result.status === 'accepted') return 'accepted'; if (result.status === 'error') return 'error'; if (result.score > 0) return 'wrong'; return 'wrong'
  }, [result])

  const handleSubmit = async () => {
    if (!nodeId) return
    await runCode(Number(nodeId), code)
    // 提交后立即更新尝试次数
    setNode((prev) => prev ? { ...prev, attempts: prev.attempts + 1 } : prev)
  }

  const goBack = () => navigate('/workshop', { state: { ts: Date.now() } })

  if (isLoading) return <AgentLessonSkeleton />
  if (!node) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#fafbf8' }}><p className="text-lg" style={{ color: '#64748b' }}>节点未找到</p></div>

  const trackCfg = TRACK_CONFIG[node.track] || TRACK_CONFIG.ml
  const diffColor = node.difficulty === 'beginner' ? '#16a34a' : node.difficulty === 'advanced' ? '#dc2626' : '#d97706'

  return (
    <PageTransition>
      <div className="h-screen flex flex-col" style={{ background: '#fafbf8' }}>
        <nav className="shrink-0 z-40 nav-glow" style={{ background: 'rgba(250,251,248,0.9)', backdropFilter: 'blur(24px)', borderBottom: '1px solid #e6e8e3' }}>
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <button onClick={goBack} className="text-sm shrink-0 transition-colors font-medium" style={{ color: '#64748b' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#1e293b' }} onMouseLeave={e => { e.currentTarget.style.color = '#64748b' }}>← 返回地图</button>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold truncate" style={{ color: '#1e293b' }}>{node.title}</h1>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium" style={{ color: '#d97706' }}>+{node.xp_reward} XP</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: `${diffColor}14`, color: diffColor }}>{node.difficulty === 'beginner' ? '入门' : node.difficulty === 'advanced' ? '高级' : '进阶'}</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: `${trackCfg.color}14`, color: trackCfg.color }}>{trackCfg.name}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm shrink-0" style={{ color: '#64748b' }}>
              <span>尝试次数: {node.attempts}</span>
              {node.energy_score > 0 && <span style={{ color: '#d97706' }}>⚡ {node.energy_score}级</span>}
            </div>
          </div>
        </nav>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-1/2 border-r overflow-y-auto p-6" style={{ borderColor: '#e6e8e3' }}>
            <div className="prose max-w-none"><div dangerouslySetInnerHTML={{ __html: renderMarkdown(node.content || '') }} /></div>
            <div className="mt-6">
              <button onClick={() => setShowHint(!showHint)} className="text-sm transition-colors font-medium" style={{ color: '#d97706' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#b45309' }} onMouseLeave={e => { e.currentTarget.style.color = '#d97706' }}>{showHint ? '隐藏提示' : '💡 查看提示'}</button>
              {showHint && node.hint && <div className="mt-2 p-3.5 rounded-xl text-sm" style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>{node.hint}</div>}
            </div>
          </div>

          <div className="w-1/2 flex flex-col">
            <div className="flex-1 p-4 min-h-0"><CodeEditor value={code} onChange={setCode} language="python" height="100%" /></div>
            <div className="px-4 py-3 flex items-center gap-3 shrink-0" style={{ borderTop: '1px solid #e6e8e3', background: 'rgba(250,251,248,0.6)' }}>
              <Button onClick={handleSubmit} isLoading={isRunning} size="sm">{isRunning ? '评测中...' : '▶ 运行代码'}</Button>
              <Button variant="secondary" size="sm" onClick={() => setCode(node.starter_code || '')}>重置</Button>
              <span className="text-xs ml-auto" style={{ color: '#94a3b8' }}>{node.attempts} 次尝试</span>
            </div>

            {(result || error) && (
              <div className="p-4 max-h-72 overflow-y-auto shrink-0" style={{ borderTop: '1px solid #e6e8e3' }}>
                {error && <div className="rounded-xl p-3.5 text-sm mb-3" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}><div className="whitespace-pre-wrap">{error}</div></div>}
                {result && (
                  <div className="space-y-3">
                    <div className="rounded-xl p-4" style={{ background: resultStatus === 'accepted' ? '#f0fdf4' : '#fffbeb', border: `1px solid ${resultStatus === 'accepted' ? '#bbf7d0' : '#fde68a'}` }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold" style={{ color: resultStatus === 'accepted' ? '#16a34a' : '#d97706' }}>{resultStatus === 'accepted' ? '✓ 通过' : '继续优化'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {result.xp_earned > 0 && <span className="font-mono text-xs px-2 py-0.5 rounded font-medium" style={{ color: '#b45309', background: '#fef3c7' }}>+{result.xp_earned} XP</span>}
                          <span className="font-mono text-sm tabular-nums" style={{ color: '#475569' }}>得分 {result.score}</span>
                        </div>
                      </div>
                      <EnergyRating detail={result.energy_detail} totalScore={result.energy_score} />
                      {result.ai_analysis && (
                        <div className="mt-3 p-3.5 rounded-xl" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                          <div className="flex items-center gap-2 mb-2"><span style={{ color: '#059669' }}>🔬 AI 分析</span></div>
                          <div className="text-sm whitespace-pre-wrap" style={{ color: '#334155' }}>{result.ai_analysis}</div>
                        </div>
                      )}
                      {result.stdout && <div className="mt-2"><span className="text-xs" style={{ color: '#94a3b8' }}>输出:</span><pre className="mt-1 rounded-lg p-2.5 text-xs overflow-x-auto" style={{ background: '#f4f6f1', color: '#334155' }}>{result.stdout}</pre></div>}
                      {result.stderr && <div className="mt-2"><span className="text-xs" style={{ color: '#94a3b8' }}>错误:</span><pre className="mt-1 rounded-lg p-2.5 text-xs overflow-x-auto" style={{ background: '#f4f6f1', color: '#dc2626' }}>{result.stderr}</pre></div>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <AIChat context={{ lesson_title: node.title, code, error: error || undefined }} />
      </div>
    </PageTransition>
  )
}

function AgentLessonSkeleton() {
  return (
    <div className="animate-pulse h-screen flex flex-col" style={{ background: '#fafbf8' }}>
      <nav style={{ background: 'rgba(250,251,248,0.9)', borderBottom: '1px solid #e6e8e3' }}>
        <div className="px-6 py-3 flex items-center gap-4"><div className="h-5 w-20 rounded skeleton-shimmer" /><div className="h-6 w-32 rounded skeleton-shimmer" /></div>
      </nav>
      <div className="flex-1 flex">
        <div className="w-1/2 p-6 space-y-3" style={{ borderRight: '1px solid #e6e8e3' }}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-4 rounded skeleton-shimmer" style={{ width: `${[85, 70, 90, 55, 75, 60][i]}%` }} />)}
        </div>
        <div className="w-1/2 flex flex-col"><div className="flex-1 p-4"><div className="h-full rounded-xl skeleton-shimmer" /></div></div>
      </div>
    </div>
  )
}
