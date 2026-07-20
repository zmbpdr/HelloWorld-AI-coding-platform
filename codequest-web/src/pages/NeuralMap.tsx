import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { getNeuralMap, getAgentTracks, type NeuralMapData, type NeuronNode, type TrackOverview } from '../api/agent'
import PageTransition from '../components/ui/PageTransition'

const TRACK_CONFIG: Record<string, { name: string; color: string; icon: string }> = {
  ml: { name: '机器学习', color: '#14b8a6', icon: '📊' },
  agent: { name: 'Agent开发', color: '#6366f1', icon: '🤖' },
  llm: { name: '大模型应用', color: '#ec4899', icon: '💡' },
  project: { name: '综合项目', color: '#f59e0b', icon: '🚀' },
  dl: { name: '深度学习', color: '#8b5cf6', icon: '🧠' },
  nlp: { name: '自然语言处理', color: '#06b6d4', icon: '📝' },
  cv: { name: '计算机视觉', color: '#10b981', icon: '👁' },
  rl: { name: '强化学习', color: '#f97316', icon: '🎮' },
}

const STATUS_CONFIG: Record<string, { border: string; bg: string; glow: string; ring: string; label: string; textColor: string }> = {
  locked: { border: '#e6e8e3', bg: '#f8fafc', glow: 'none', ring: '#cbd5e1', label: '未激活', textColor: '#94a3b8' },
  available: { border: '#a7f3d0', bg: '#ffffff', glow: '0 0 0 3px rgba(16,185,129,0.06)', ring: '#10b981', label: '可激活', textColor: '#059669' },
  in_progress: { border: '#fde68a', bg: '#fffbeb', glow: '0 0 0 3px rgba(245,158,11,0.08)', ring: '#f59e0b', label: '激活中', textColor: '#d97706' },
  completed: { border: '#bbf7d0', bg: '#f0fdf4', glow: '0 0 0 3px rgba(34,197,94,0.06)', ring: '#22c55e', label: '已激活', textColor: '#16a34a' },
  mastered: { border: '#fde68a', bg: '#fffbeb', glow: '0 0 0 3px rgba(251,191,36,0.1)', ring: '#fbbf24', label: '精通', textColor: '#b45309' },
}

function EnergyDots({ level }: { level: number }) {
  return <div className="flex items-center gap-0.5">{Array.from({ length: 5 }).map((_, i) => (
    <span key={i} className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: i < level ? '#f59e0b' : '#e2e8f0' }} />
  ))}</div>
}

export default function NeuralMap() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const initialTrack = searchParams.get('track') || ''
  const [mapData, setMapData] = useState<NeuralMapData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTrack, setActiveTrack] = useState(initialTrack)

  useEffect(() => {
    setIsLoading(true)
    Promise.all([getNeuralMap(), getAgentTracks().catch(() => [])])
      .then(([data, tracks]) => {
        const fullData: NeuralMapData = { ...data, tracks } as NeuralMapData
        setMapData(fullData)
        const trackList = tracks as TrackOverview[]
        if (!initialTrack && trackList.length > 0) setActiveTrack(trackList[0].track)
        if (initialTrack && trackList.length > 0 && !trackList.find(t => t.track === initialTrack)) setActiveTrack(trackList[0].track)
      })
      .catch(err => console.error('Failed to load neural map:', err))
      .finally(() => setIsLoading(false))
  }, [initialTrack, location.state])

  if (isLoading) return <NeuralMapSkeleton />

  const nodes = mapData?.nodes || []
  const tracks = mapData?.tracks || []
  const activeTrackNodes = activeTrack ? nodes.filter(n => n.track === activeTrack) : nodes
  const completedCount = activeTrackNodes.filter(n => n.status === 'completed' || n.status === 'mastered').length
  const trackCfg = TRACK_CONFIG[activeTrack] || TRACK_CONFIG.ml

  const prereqMap = new Map<number, number[]>()
  for (const edge of (mapData?.edges || [])) {
    if (!prereqMap.has(edge.target)) prereqMap.set(edge.target, [])
    prereqMap.get(edge.target)!.push(edge.source)
  }
  const sections = new Map<string, NeuronNode[]>()
  for (const node of activeTrackNodes) {
    const section = node.section || '默认'
    if (!sections.has(section)) sections.set(section, [])
    sections.get(section)!.push(node)
  }

  return (
    <PageTransition>
      <div className="min-h-screen mesh-bg" style={{ background: '#fafbf8' }}>
        <nav className="sticky top-0 z-40 nav-glow" style={{ background: 'rgba(250,251,248,0.85)', backdropFilter: 'blur(24px)', borderBottom: '1px solid #e6e8e3' }}>
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
            <button onClick={() => navigate('/')} className="text-sm font-medium transition-colors" style={{ color: '#64748b' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#1e293b' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#64748b' }}>← 返回大厅</button>
            <h1 className="text-lg font-bold" style={{ color: '#1e293b' }}>{trackCfg.icon} {trackCfg.name}</h1>
            <div className="ml-auto text-xs" style={{ color: '#94a3b8' }}>{completedCount}/{activeTrackNodes.length} 已激活</div>
          </div>
        </nav>

        <div className="border-b" style={{ background: 'rgba(250,251,248,0.6)', borderColor: '#e6e8e3' }}>
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-2 overflow-x-auto">
            {tracks.map((track: TrackOverview) => {
              const cfg = TRACK_CONFIG[track.track] || TRACK_CONFIG.ml
              const isActive = activeTrack === track.track
              return (
                <button key={track.track} onClick={() => setActiveTrack(track.track)}
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap"
                  style={{
                    background: isActive ? `${cfg.color}12` : '#ffffff',
                    border: isActive ? `1px solid ${cfg.color}40` : '1px solid #e6e8e3',
                    color: isActive ? cfg.color : '#64748b',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = `${cfg.color}08`
                      e.currentTarget.style.borderColor = `${cfg.color}20`
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'
                    }
                  }}
                >
                  <span>{cfg.icon}</span>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span>{cfg.name}</span>
                      <span className="text-xs opacity-60">{track.completed_nodes}/{track.total_nodes}</span>
                    </div>
                    <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ width: 80, background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{
                        width: `${track.total_nodes > 0 ? (track.completed_nodes / track.total_nodes) * 100 : 0}%`,
                        background: cfg.color,
                      }} />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-10">
          {Array.from(sections.entries()).map(([sectionName, sectionNodes]) => (
            <div key={sectionName} className="mb-10">
              {sectionName !== '默认' && (
                <h3 className="text-sm font-semibold mb-3 px-2 tracking-wide" style={{ color: trackCfg.color }}>{sectionName}</h3>
              )}
              <div className="space-y-2">
                {sectionNodes.map((node, nodeIdx) => {
                  const status = node.status || 'locked'
                  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.locked
                  const isClickable = status !== 'locked'
                  const prereqs = prereqMap.get(node.id) || []
                  return (
                    <button key={node.id ?? `n-${sectionName}-${nodeIdx}`}
                      onClick={() => { if (!isClickable) return; navigate(`/workshop/${node.id}`) }}
                      disabled={!isClickable}
                      className={`relative flex items-center gap-4 w-full text-left p-4 rounded-xl transition-all duration-300 ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                      style={{ background: cfg.bg, border: cfg.border, opacity: status === 'locked' ? 0.5 : 1, boxShadow: isClickable ? cfg.glow : '0 1px 2px rgba(0,0,0,0.03)' }}
                      onMouseEnter={e => {
                        if (isClickable) { e.currentTarget.style.background = `${trackCfg.color}08`; e.currentTarget.style.transform = 'translateX(6px)'; e.currentTarget.style.boxShadow = `0 2px 12px ${trackCfg.color}10` }
                      }}
                      onMouseLeave={e => {
                        if (isClickable) { e.currentTarget.style.background = cfg.bg; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = cfg.glow !== 'none' ? cfg.glow : '0 1px 2px rgba(0,0,0,0.03)' }
                      }}
                    >
                      <div className="relative z-10 w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-sm font-bold transition-all duration-300"
                        style={{ background: status === 'locked' ? '#f0f2ed' : `${cfg.ring}12`, border: `2px solid ${cfg.ring}`, color: cfg.textColor }}>
                        {status === 'completed' ? '' : status === 'mastered' ? '★' : status === 'in_progress' ? '▶' : node.id % 10}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate text-sm" style={{ color: status === 'locked' ? '#94a3b8' : '#1e293b' }}>{node.title}</h3>
                          {node.energy_score > 0 && <EnergyDots level={node.energy_score} />}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-medium" style={{ color: '#d97706' }}>+{node.xp_reward} XP</span>
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${trackCfg.color}10`, color: trackCfg.color }}>{cfg.label}</span>
                          {prereqs.length > 0 && <span className="text-xs" style={{ color: '#94a3b8' }}>前置: {prereqs.length} 节点</span>}
                        </div>
                      </div>
                      <div style={{ color: '#94a3b8' }}>{status === 'locked' ? '🔒' : '→'}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          {activeTrackNodes.length === 0 && (
            <div className="text-center py-20"><p className="text-4xl mb-3">🧠</p><p className="text-sm" style={{ color: '#94a3b8' }}>该路线暂无节点</p></div>
          )}
        </div>
      </div>
    </PageTransition>
  )
}

function NeuralMapSkeleton() {
  return (
    <div className="animate-pulse min-h-screen" style={{ background: '#fafbf8' }}>
      <nav style={{ background: 'rgba(250,251,248,0.85)', borderBottom: '1px solid #e6e8e3' }}>
        <div className="max-w-5xl mx-auto px-6 py-4"><div className="h-5 w-24 rounded skeleton-shimmer" /></div>
      </nav>
      <div className="max-w-5xl mx-auto px-6 py-10">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-xl mb-2" style={{ background: '#ffffff', border: '1px solid #e6e8e3' }}>
            <div className="w-11 h-11 rounded-full skeleton-shimmer shrink-0" />
            <div className="flex-1 space-y-2"><div className="h-4 w-3/4 rounded skeleton-shimmer" /><div className="h-3 w-16 rounded skeleton-shimmer" /></div>
          </div>
        ))}
      </div>
    </div>
  )
}
