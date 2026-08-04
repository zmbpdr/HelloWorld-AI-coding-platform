/**
 * 收藏面板组件 - SnippetPanel
 * 功能：侧边滑出的代码收藏面板，支持搜索、标签筛选、
 * 展开查看代码内容和删除收藏。
 */
import { useEffect, useState, useCallback } from 'react'
import apiClient from '../../api/client'

interface Snippet { id: number; title: string; code: string; language: string; tags: string[]; lesson_id: number | null; created_at: string }

const SNIPPET_TAGS = ['算法技巧', '常用模板', '调试方案', '语法备忘', '其他']

export default function SnippetPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)

  const fetchSnippets = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams(); if (search) params.set('search', search); if (tagFilter) params.set('tag', tagFilter)
    apiClient.get(`/snippets?${params}`).then(r => setSnippets(r.data.items || [])).catch(() => {}).finally(() => setLoading(false))
  }, [search, tagFilter])

  useEffect(() => { if (isOpen) fetchSnippets() }, [isOpen, fetchSnippets])

  const handleDelete = async (id: number) => { await apiClient.delete(`/snippets/${id}`); fetchSnippets() }
  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.2)' }} onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 flex flex-col" style={{ width: 420, maxWidth: '100vw', background: '#ffffff', borderLeft: '1px solid #e6e8e3', boxShadow: '-10px 0 40px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #e6e8e3' }}>
          <h2 className="text-lg font-bold" style={{ color: '#1e293b' }}>📌 收藏夹</h2>
          <button onClick={onClose} style={{ color: '#94a3b8', fontSize: 20 }}>✕</button>
        </div>
        <div className="px-6 py-3 space-y-2" style={{ borderBottom: '1px solid #e6e8e3' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索标题或代码..."
            className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: '#f4f6f1', color: '#1e293b', border: '1px solid #e6e8e3' }} />
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setTagFilter('')} className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors"
              style={{ background: !tagFilter ? '#10b981' : '#f4f6f1', color: !tagFilter ? '#fff' : '#64748b' }}>全部</button>
            {SNIPPET_TAGS.map(tag => (
              <button key={tag} onClick={() => setTagFilter(tag === tagFilter ? '' : tag)} className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors"
                style={{ background: tagFilter === tag ? '#10b981' : '#f4f6f1', color: tagFilter === tag ? '#fff' : '#64748b' }}>{tag}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-3">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 rounded-xl skeleton-shimmer" />)
          ) : snippets.length === 0 ? (
            <div className="text-center py-12" style={{ color: '#94a3b8' }}>
              <p className="text-3xl mb-2">📌</p><p className="text-sm">暂无收藏</p><p className="text-xs mt-1">在代码编辑器中点击 ⭐ 收藏代码片段</p>
            </div>
          ) : (
            snippets.map(s => (
              <div key={s.id} className="rounded-xl p-3" style={{ background: '#f8fafc', border: '1px solid #e6e8e3' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm truncate" style={{ color: '#1e293b' }}>{s.title}</span>
                  <button onClick={() => handleDelete(s.id)} className="text-xs" style={{ color: '#94a3b8' }}>🗑️</button>
                </div>
                {s.tags.length > 0 && <div className="flex gap-1 mb-2">{s.tags.map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#ecfdf5', color: '#059669' }}>{t}</span>)}</div>}
                <button onClick={() => setExpanded(expanded === s.id ? null : s.id)} className="text-xs font-medium" style={{ color: '#059669' }}>{expanded === s.id ? '收起' : '查看代码'}</button>
                {expanded === s.id && <pre className="mt-2 p-3 rounded-lg text-xs overflow-x-auto" style={{ background: '#f4f6f1', color: '#334155', border: '1px solid #e6e8e3' }}>{s.code}</pre>}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
