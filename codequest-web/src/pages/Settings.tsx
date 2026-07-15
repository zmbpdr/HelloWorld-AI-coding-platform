import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '../stores/userStore'
import PageTransition from '../components/ui/PageTransition'

function loadSetting<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored !== null ? JSON.parse(stored) : fallback
  } catch { return fallback }
}

function saveSetting<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

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
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const handleEditorFontSizeChange = useCallback((size: number) => {
    setEditorFontSize(size)
    saveSetting('codequest_editor_font_size', size)
    showToast(`代码字号 → ${size}px`)
  }, [showToast])

  const handleClearAIHistory = useCallback(() => {
    localStorage.removeItem('codequest_ai_history')
    showToast('AI 对话历史已清空')
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
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'codequest-backup.json'
    a.click()
    URL.revokeObjectURL(url)
    showToast('数据导出成功')
  }, [showToast])

  const handleResetProgress = useCallback(() => {
    if (!window.confirm('确定要重置所有学习进度吗？此操作不可恢复。')) return
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('codequest_progress') || key.startsWith('codequest_xp'))) keys.push(key)
    }
    keys.forEach((k) => localStorage.removeItem(k))
    showToast('学习进度已重置，请刷新页面')
  }, [showToast])

  const sectionStyle = {
    background: 'rgba(15,19,34,0.65)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 18,
    padding: 24,
    boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
  }

  const sectionTitleStyle = { color: '#e2e8f0', fontSize: 17, fontWeight: 700, marginBottom: 16 }

  return (
    <PageTransition>
      <div className="min-h-screen mesh-bg" style={{ background: '#080c17' }}>
        <nav
          className="sticky top-0 z-40 border-b border-white/[0.04] nav-glow"
          style={{ background: 'rgba(8,12,23,0.85)', backdropFilter: 'blur(24px)' }}
        >
          <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
            <button onClick={() => navigate(isAuthenticated ? '/profile' : '/')} className="text-sm transition-colors" style={{ color: '#94a3b8' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#e2e8f0' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8' }}
            >
              ← 返回
            </button>
            <h1 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>设置</h1>
          </div>
        </nav>

        <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">
          {/* AI 导师 */}
          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>AI 导师</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{
                  background: aiOnline ? '#22c55e' : '#f59e0b',
                  boxShadow: aiOnline ? '0 0 8px rgba(34,197,94,0.5)' : '0 0 8px rgba(245,158,11,0.5)',
                }} />
                <span className="text-sm" style={{ color: '#cbd5e1' }}>{aiOnline ? 'AI 导师已就绪' : 'AI 连接中…'}</span>
              </div>
              <button
                onClick={handleClearAIHistory}
                className="px-4 py-2 text-sm rounded-xl transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.06)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              >
                清空对话历史
              </button>
            </div>
            <p className="text-xs mt-3" style={{ color: '#475569' }}>AI 导师自动选择最优后端提供服务，无需手动配置</p>
          </section>

          {/* 编辑器偏好 */}
          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>编辑器偏好</h2>
            <div>
              <label className="block text-sm mb-2" style={{ color: '#94a3b8' }}>
                代码字号: <span className="font-mono" style={{ color: '#e2e8f0' }}>{editorFontSize}px</span>
              </label>
              <input
                type="range" min={10} max={24} step={1}
                value={editorFontSize}
                onChange={(e) => handleEditorFontSizeChange(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{ accentColor: '#6366f1', background: 'rgba(255,255,255,0.05)' }}
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: '#475569' }}>
                <span>10px</span><span>24px</span>
              </div>
            </div>
          </section>

          {/* 通知 */}
          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>通知</h2>
            <div className="space-y-4">
              <ToggleRow
                label="学习提醒"
                description="每日打卡提醒，保持学习节奏"
                enabled={reminderEnabled}
                onToggle={() => {
                  const v = !reminderEnabled
                  setReminderEnabled(v)
                  saveSetting('codequest_reminder', v)
                  showToast(v ? '学习提醒已开启' : '学习提醒已关闭')
                }}
              />
              <ToggleRow
                label="成就解锁通知"
                description="解锁成就时显示动画和提示"
                enabled={achievementNotify}
                onToggle={() => {
                  const v = !achievementNotify
                  setAchievementNotify(v)
                  saveSetting('codequest_achievement_notify', v)
                  showToast(v ? '成就通知已开启' : '成就通知已关闭')
                }}
              />
            </div>
          </section>

          {/* 快捷键 */}
          <section style={sectionStyle}>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ ...sectionTitleStyle, marginBottom: 0 }}>快捷键</h2>
              <button onClick={() => setShowShortcuts(!showShortcuts)} className="text-sm transition-colors" style={{ color: '#818cf8' }}>
                {showShortcuts ? '收起' : '查看'}
              </button>
            </div>
            {showShortcuts && (
              <div className="space-y-2">
                {[
                  ['Ctrl + Enter', '运行代码'],
                  ['Ctrl + S', '保存草稿'],
                  ['Ctrl + /', '切换行注释'],
                  ['Ctrl + H', '显示提示'],
                  ['Tab', '缩进'],
                  ['Shift + Tab', '取消缩进'],
                ].map(([keys, desc]) => (
                  <div key={keys} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <span className="text-sm" style={{ color: '#94a3b8' }}>{desc}</span>
                    <kbd className="px-2 py-0.5 text-xs rounded font-mono" style={{ background: 'rgba(255,255,255,0.08)', color: '#cbd5e1' }}>{keys}</kbd>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 隐私与数据 */}
          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>隐私与数据</h2>
            <div className="space-y-3">
              <button onClick={handleExportData}
                className="w-full text-left px-4 py-3 rounded-xl transition-colors"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              >
                <span className="text-sm" style={{ color: '#cbd5e1' }}>📛 导出本地数据</span>
                <p className="text-xs mt-0.5" style={{ color: '#475569' }}>导出浏览器中保存的所有学习数据</p>
              </button>
              <button onClick={handleResetProgress}
                className="w-full text-left px-4 py-3 rounded-xl transition-colors"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)' }}
              >
                <span className="text-sm" style={{ color: '#fca5a5' }}>🔧 重置学习进度</span>
                <p className="text-xs mt-0.5" style={{ color: '#475569' }}>清除本地学习进度，账号数据不受影响</p>
              </button>
            </div>
          </section>

          {/* 关于 */}
          <section style={{ ...sectionStyle, textAlign: 'center' }}>
            <h2 style={{ color: '#cbd5e1', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Hello World</h2>
            <p className="text-sm" style={{ color: '#64748b' }}>v0.2.0</p>
            <p className="text-sm mt-1" style={{ color: '#475569' }}>闯关式 AI 编程学习平台</p>
            <p className="text-xs mt-0.5" style={{ color: '#334155' }}>让编程学习像游戏一样有趣</p>
            <div className="flex justify-center gap-4 mt-3 text-xs" style={{ color: '#334155' }}>
              {['本地 AI 导师', '多语言支持', '即时反馈'].map((f, i, arr) => (
                <span key={f}>{f}{i < arr.length - 1 ? ' · ' : ''}</span>
              ))}
            </div>
            <p className="text-xs mt-4" style={{ color: '#1f2937' }}>© 2026 Hello World Team</p>
          </section>
        </div>

        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-[100] px-4 py-3 rounded-xl shadow-2xl text-sm font-medium transition-all duration-300 ${
              toast.type === 'success' ? 'bg-green-900/90 border border-green-700 text-green-200' : 'bg-red-900/90 border border-red-700 text-red-200'
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </PageTransition>
  )
}

function ToggleRow({ label, description, enabled, onToggle }: { label: string; description: string; enabled: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm" style={{ color: '#cbd5e1' }}>{label}</p>
        <p className="text-xs" style={{ color: '#475569' }}>{description}</p>
      </div>
      <button
        onClick={onToggle}
        className="relative w-12 h-7 rounded-full transition-colors"
        style={{ background: enabled ? '#6366f1' : 'rgba(255,255,255,0.08)' }}
      >
        <div
          className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform"
          style={{ transform: enabled ? 'translateX(20px)' : 'translateX(2px)' }}
        />
      </button>
    </div>
  )
}
