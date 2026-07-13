import { useEffect, useState, useCallback } from 'react'
import apiClient from '../../api/client'

interface Snippet {
  id: number
  title: string
  code: string
  language: string
  tags: string[]
  lesson_id: number | null
  created_at: string
}

const SNIPPET_TAGS = ['算法技巧', '常用模板', '调试方案', '语法备忘', '其他']

export default function SnippetPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)

  const fetchSnippets = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (tagFilter) params.set('tag', tagFilter)
    apiClient.get(`/snippets?${params}`)
      .then(r => setSnippets(r.data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [search, tagFilter])

  useEffect(() => { if (isOpen) fetchSnippets() }, [isOpen, fetchSnippets])

  const handleDelete = async (id: number) => {
    await apiClient.delete(`/snippets/${id}`)
    fetchSnippets()
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col"
        style={{ width: 420, maxWidth: '100vw', background: '#0b0e1a', borderLeft: '1px solid rgba(255,255,255,0.06)', boxShadow: '-10px 0 40px rgba(0,0,0,0.5)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <h2 className="text-lg font-bold" style={{ color: '#f1f5f9' }}>📌 收藏夹</h2>
          <button onClick={onClose} style={{ color: '#64748b', fontSize: 20 }}>✕</button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 space-y-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜索标题或代码..."
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.06)' }}
          />
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setTagFilter('')} className={`text-[11px] px-2.5 py-1 rounded-full ${!tagFilter ? 'text-white' : ''}`}
              style={{ background: !tagFilter ? '#6366f1' : 'rgba(255,255,255,0.04)', color: !tagFilter ? '#fff' : '#94a3b8' }}>
              全部
            </button>
            {SNIPPET_TAGS.map(tag => (
              <button key={tag} onClick={() => setTagFilter(tag === tagFilter ? '' : tag)}
                className="text-[11px] px-2.5 py-1 rounded-full transition-colors"
                style={{ background: tagFilter === tag ? '#6366f1' : 'rgba(255,255,255,0.04)', color: tagFilter === tag ? '#fff' : '#94a3b8' }}>
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-3">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 rounded-xl skeleton-shimmer" />)
          ) : snippets.length === 0 ? (
            <div className="text-center py-12" style={{ color: '#64748b' }}>
              <p className="text-3xl mb-2">📌</p>
              <p className="text-sm">暂无收藏</p>
              <p className="text-xs mt-1">在代码编辑器中点击 ⭐ 收藏代码片段</p>
            </div>
          ) : (
            snippets.map(s => (
              <div key={s.id} className="rounded-xl p-3 transition-colors" style={{ background: 'rgba(15,19,34,0.6)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm truncate" style={{ color: '#e2e8f0' }}>{s.title}</span>
                  <button onClick={() => handleDelete(s.id)} className="text-xs" style={{ color: '#64748b' }}>🗑️</button>
                </div>
                {s.tags.length > 0 && (
                  <div className="flex gap-1 mb-2">
                    {s.tags.map(t => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc' }}>{t}</span>
                    ))}
                  </div>
                )}
                <button onClick={() => setExpanded(expanded === s.id ? null : s.id)} className="text-xs" style={{ color: '#6366f1' }}>
                  {expanded === s.id ? '收起' : '查看代码'}
                </button>
                {expanded === s.id && (
                  <pre className="mt-2 p-3 rounded-lg text-xs overflow-x-auto" style={{ background: '#0f1322', color: '#cbd5e1', border: '1px solid #1f2937' }}>
                    {s.code}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
