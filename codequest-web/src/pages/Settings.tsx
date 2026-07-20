import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '../stores/userStore'
import PageTransition from '../components/ui/PageTransition'

function loadSetting<T>(key: string, fallback: T): T {
  try { const stored = localStorage.getItem(key); return stored !== null ? JSON.parse(stored) : fallback }
  catch { return fallback }
}
function saveSetting<T>(key: string, value: T) { localStorage.setItem(key, JSON.stringify(value)) }

type ToastType = { message: string; type: 'success' | 'error' }

export default function Settings() {
  const navigate = useNavigate()
  const { isAuthenticated } = useUserStore()

  const [editorFontSize, setEditorFontSize] = useState(() => loadSetting<number>('codequest_editor_font_size', 14))
  const [reminderEnabled, setReminderEnabled] = useState(() => loadSetting<boolean>('codequest_reminder', true))
  const [achievementNotify, setAchievementNotify] = useState(() => loadSetting<boolean>('codequest_achievement_notify', true))
  const [aiOnline] = useState(true)
  const [toast, setToast] = useState<ToastType | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type }); setTimeout(() => setToast(null), 3000)
  }, [])

  const handleClearAIHistory = useCallback(() => {
    localStorage.removeItem('codequest_ai_history'); showToast('AI 对话历史已清空')
  }, [showToast])
  const handleExportData = useCallback(() => {
    const data: Record<string, unknown> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('codequest_')) {
        try { data[key] = JSON.parse(localStorage.getItem(key)!) } catch { data[key] = localStorage.getItem(key) }
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'codequest-backup.json'; a.click()
    URL.revokeObjectURL(a.href); showToast('数据导出成功')
  }, [showToast])

  const sectionStyle = { background: '#ffffff', border: '1px solid #e6e8e3', borderRadius: 18, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }
  const sectionTitleStyle = { color: '#1e293b', fontSize: 17, fontWeight: 700, marginBottom: 16 }

  return (
    <PageTransition>
      <div className="min-h-screen mesh-bg" style={{ background: '#fafbf8' }}>
        <nav className="sticky top-0 z-40 nav-glow" style={{ background: 'rgba(250,251,248,0.85)', backdropFilter: 'blur(24px)', borderBottom: '1px solid #e6e8e3' }}>
          <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
            <button onClick={() => navigate(isAuthenticated ? '/profile' : '/')} className="text-sm font-medium transition-colors" style={{ color: '#64748b' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#1e293b' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#64748b' }}>← 返回</button>
            <h1 className="text-xl font-bold" style={{ color: '#1e293b' }}>设置</h1>
          </div>
        </nav>

        <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">
          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>小智</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ background: aiOnline ? '#22c55e' : '#f59e0b', boxShadow: aiOnline ? '0 0 8px rgba(34,197,94,0.3)' : '0 0 8px rgba(245,158,11,0.3)' }} />
                <span className="text-sm" style={{ color: '#334155' }}>{aiOnline ? '小智已就绪' : 'AI 连接中…'}</span>
              </div>
              <button onClick={handleClearAIHistory} className="px-4 py-2 text-sm rounded-xl transition-colors"
                style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e6e8e3' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f4f6f1' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc' }}>清空对话历史</button>
            </div>
            <p className="text-xs mt-3" style={{ color: '#94a3b8' }}>小智自动选择最优后端提供服务，无需手动配置</p>
          </section>

          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>编辑器偏好</h2>
            <div>
              <label className="block text-sm mb-2" style={{ color: '#64748b' }}>
                代码字号: <span className="font-mono" style={{ color: '#1e293b' }}>{editorFontSize}px</span>
              </label>
              <input type="range" min={10} max={24} step={1} value={editorFontSize}
                onChange={(e) => { const v = Number(e.target.value); setEditorFontSize(v); saveSetting('codequest_editor_font_size', v); showToast(`代码字号 → ${v}px`) }}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer" style={{ accentColor: '#10b981', background: '#f0f2ed' }} />
              <div className="flex justify-between text-xs mt-1" style={{ color: '#94a3b8' }}><span>10px</span><span>24px</span></div>
            </div>
          </section>

          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>通知</h2>
            <div className="space-y-4">
              <ToggleRow label="学习提醒" description="每日打卡提醒，保持学习节奏" enabled={reminderEnabled}
                onToggle={() => { const v = !reminderEnabled; setReminderEnabled(v); saveSetting('codequest_reminder', v); showToast(v ? '学习提醒已开启' : '学习提醒已关闭') }} />
              <ToggleRow label="成就解锁通知" description="解锁成就时显示动画和提示" enabled={achievementNotify}
                onToggle={() => { const v = !achievementNotify; setAchievementNotify(v); saveSetting('codequest_achievement_notify', v); showToast(v ? '成就通知已开启' : '成就通知已关闭') }} />
            </div>
          </section>

          <section style={sectionStyle}>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ ...sectionTitleStyle, marginBottom: 0 }}>快捷键</h2>
              <button onClick={() => setShowShortcuts(!showShortcuts)} className="text-sm font-medium transition-colors" style={{ color: '#059669' }}>{showShortcuts ? '收起' : '查看'}</button>
            </div>
            {showShortcuts && (
              <div className="space-y-2">
                {[['Ctrl + Enter', '运行代码'], ['Ctrl + S', '保存草稿'], ['Ctrl + /', '切换行注释'], ['Ctrl + H', '显示提示'], ['Tab', '缩进'], ['Shift + Tab', '取消缩进']].map(([keys, desc]) => (
                  <div key={keys} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: '#f8fafc' }}>
                    <span className="text-sm" style={{ color: '#64748b' }}>{desc}</span>
                    <kbd className="px-2 py-0.5 text-xs rounded font-mono" style={{ background: '#f0f2ed', color: '#334155' }}>{keys}</kbd>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>隐私与数据</h2>
            <div className="space-y-3">
              <button onClick={handleExportData} className="w-full text-left px-4 py-3 rounded-xl transition-colors"
                style={{ background: '#f8fafc', border: '1px solid #e6e8e3' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f4f6f1' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc' }}>
                <span className="text-sm" style={{ color: '#334155' }}>📛 导出本地数据</span>
                <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>导出浏览器中保存的所有学习数据</p>
              </button>
              <button onClick={() => { if (window.confirm('确定要重置所有学习进度吗？此操作不可恢复。')) { const keys: string[] = []; for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key && (key.startsWith('codequest_progress') || key.startsWith('codequest_xp'))) keys.push(key) } keys.forEach(k => localStorage.removeItem(k)); showToast('学习进度已重置，请刷新页面') } }}
                className="w-full text-left px-4 py-3 rounded-xl transition-colors"
                style={{ background: '#f8fafc', border: '1px solid #e6e8e3' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fecaca' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e6e8e3' }}>
                <span className="text-sm" style={{ color: '#dc2626' }}>🔧 重置学习进度</span>
                <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>清除本地学习进度，账号数据不受影响</p>
              </button>
            </div>
          </section>

          <section style={{ ...sectionStyle, textAlign: 'center' }}>
            <h2 style={{ color: '#334155', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Hello World</h2>
            <p className="text-sm" style={{ color: '#94a3b8' }}>v0.2.0</p>
            <p className="text-sm mt-1" style={{ color: '#64748b' }}>闯关式 AI 编程学习平台</p>
            <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>让编程学习像游戏一样有趣</p>
            <div className="flex justify-center gap-4 mt-3 text-xs" style={{ color: '#94a3b8' }}>
              {['本地 小智', '多语言支持', '即时反馈'].map((f, i, arr) => <span key={f}>{f}{i < arr.length - 1 ? ' · ' : ''}</span>)}
            </div>
            <p className="text-xs mt-4" style={{ color: '#cbd5e1' }}>© 2026 Hello World Team</p>
          </section>
        </div>

        {toast && (
          <div className={`fixed bottom-6 right-6 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all duration-300 ${
            toast.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'
          }`}>{toast.message}</div>
        )}
      </div>
    </PageTransition>
  )
}

function ToggleRow({ label, description, enabled, onToggle }: { label: string; description: string; enabled: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div><p className="text-sm" style={{ color: '#334155' }}>{label}</p><p className="text-xs" style={{ color: '#94a3b8' }}>{description}</p></div>
      <button onClick={onToggle} className="relative w-12 h-7 rounded-full transition-colors" style={{ background: enabled ? '#10b981' : '#e2e8f0' }}>
        <div className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform" style={{ transform: enabled ? 'translateX(20px)' : 'translateX(2px)' }} />
      </button>
    </div>
  )
}
