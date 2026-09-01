/**
 * AI 聊天组件 - AIChat
 * 功能：浮动 AI 助手聊天窗口，支持四种模式（诊断/导师/审查/规划），
 * 包含消息列表、模式切换、导出对话和拖拽功能。
 */
import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react'
import { useAI } from '../../hooks/useAI'
import type { ChatRequest, AIMode } from '../../api/ai'
import { renderMarkdown } from '../../utils/markdown'

interface AIChatProps {
  lessonId?: number
  context?: ChatRequest['context']
}

const MODE_CONFIG: { key: AIMode; label: string; icon: string; placeholder: string; welcome: string }[] = [
  { key: 'diagnostic', label: '诊断', icon: '🔍', placeholder: '描述你的代码问题，AI 帮你诊断...', welcome: '你好！我是AI诊断助手，把你的代码发给我，我帮你找出问题所在。' },
  { key: 'tutor', label: '导师', icon: '🧑‍🏫', placeholder: '向小智提问...', welcome: '你好！我是你的小智，有任何问题都可以问我。' },
  { key: 'review', label: '审查', icon: '📋', placeholder: '让AI审查你的代码质量...', welcome: '你好！我是AI代码审查员，发代码给我，我给你全面的质量评估。' },
  { key: 'planning', label: '规划', icon: '📈', placeholder: '让AI帮你规划学习路径...', welcome: '你好！我是AI学习规划师，告诉我你的目标，我帮你制定学习计划。' },
]

export default function AIChat({ lessonId, context }: AIChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const { messages, isLoading, mode, setMode, sendMessage, clearMessages } = useAI(lessonId)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const currentMode = MODE_CONFIG.find(m => m.key === mode) || MODE_CONFIG[1]

  // 拖拽
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, left: 0, top: 0 })
  const hasMoved = useRef(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const btn = btnRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    dragStart.current = { x: e.clientX, y: e.clientY, left: pos?.left ?? rect.left, top: pos?.top ?? rect.top }
    hasMoved.current = false
    setDragging(true)
  }, [pos])

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.x
      const dy = e.clientY - dragStart.current.y
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved.current = true
      setPos({ left: dragStart.current.left + dx, top: dragStart.current.top + dy })
    }
    const onUp = () => setDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [dragging])

  const handleToggle = useCallback(() => { if (!hasMoved.current) setIsOpen(prev => !prev) }, [])
  const handleSend = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    const message = input.trim()
    const mergedContext = {
      ...context,
      lesson_id: lessonId ?? context?.lesson_id,
    }
    setInput('')
    await sendMessage(message, mergedContext)
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 w-[400px] h-[560px] flex flex-col z-50"
          style={{
            background: 'rgba(255,255,255,0.96)',
            border: '1px solid #e6e8e3',
            borderRadius: 20,
            backdropFilter: 'blur(24px)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid #f0f2ed' }}>
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                {currentMode.icon}
              </div>
              <h3 className="font-semibold" style={{ color: '#1e293b' }}>AI {currentMode.label}</h3>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={() => {
                    const md = messages.map(m => `**${m.role === 'user' ? '🧑 你' : `🤖 AI ${currentMode.label}`}**\n\n${m.content}\n`).join('\n---\n\n')
                    const blob = new Blob([`# AI 对话记录 (${currentMode.label}模式)\n\n${md}`], { type: 'text/markdown' })
                    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `ai-chat-${mode}-${new Date().toISOString().slice(0, 10)}.md`; a.click()
                  }}
                  className="text-xs px-2 py-1 rounded-lg transition-colors"
                  style={{ color: '#94a3b8' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = '#f4f6f1' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent' }}
                  title="导出对话为 Markdown"
                >📥 导出</button>
              )}
              <button
                onClick={clearMessages}
                className="text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                style={{ color: '#94a3b8' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f4f6f1'; e.currentTarget.style.color = '#475569' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8' }}
              >清空</button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-lg px-1.5 py-1 rounded-lg transition-colors"
                style={{ color: '#94a3b8' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#1e293b' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8' }}
              >✕</button>
            </div>
          </div>

          {/* 模式切换标签 */}
          <div className="flex items-center gap-1.5 px-5 py-2.5" style={{ borderBottom: '1px solid #f0f2ed' }}>
            <span className="text-xs mr-1 shrink-0" style={{ color: '#94a3b8' }}>模式</span>
            {MODE_CONFIG.map((m) => (
              <button
                key={m.key}
                onClick={() => { setMode(m.key); clearMessages() }}
                className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: mode === m.key ? '#ecfdf5' : '#f8fafc',
                  border: mode === m.key ? '1px solid #a7f3d0' : '1px solid transparent',
                  color: mode === m.key ? '#059669' : '#94a3b8',
                }}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>

          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-10">
                <p className="text-3xl mb-3">{currentMode.icon}</p>
                <p className="text-sm" style={{ color: '#94a3b8' }}>{currentMode.welcome}</p>
              </div>
            )}
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed overflow-hidden"
                  style={{
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : '#f4f6f1',
                    color: msg.role === 'user' ? '#fff' : '#334155',
                    borderBottomRightRadius: msg.role === 'user' ? 6 : undefined,
                    borderBottomLeftRadius: msg.role === 'assistant' ? 6 : undefined,
                  }}
                >
                  {msg.role === 'assistant' ? (
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content || '') }} />
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-3" style={{ background: '#f4f6f1', borderBottomLeftRadius: 6 }}>
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#10b981', animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#34d399', animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#6ee7b7', animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入框 */}
          <form onSubmit={handleSend} className="p-3" style={{ borderTop: '1px solid #f0f2ed' }}>
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={currentMode.placeholder}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200"
                style={{ background: '#f4f6f1', border: '1px solid transparent', color: '#1e293b' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#a7f3d0'; e.currentTarget.style.background = '#ffffff' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = '#f4f6f1' }}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed text-white"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 2px 8px rgba(16,185,129,0.2)' }}
              >发送</button>
            </div>
          </form>
        </div>
      )}

      {/* 浮动按钮 */}
      <div
        className="fixed z-50 select-none"
        style={{ ...(pos ? { left: `${pos.left}px`, top: `${pos.top}px` } : { right: 24, bottom: 24 }), cursor: dragging ? 'grabbing' : 'grab' }}
      >
        <button
          ref={btnRef}
          onMouseDown={onMouseDown}
          onClick={handleToggle}
          className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-xl transition-all duration-300"
          title={`小智 · ${currentMode.label}`}
          style={{
            background: isOpen ? 'rgba(255,255,255,0.9)' : 'linear-gradient(135deg, #10b981, #059669)',
            boxShadow: isOpen ? '0 2px 12px rgba(0,0,0,0.06)' : '0 4px 24px rgba(16,185,129,0.35)',
            transform: isOpen ? 'rotate(90deg)' : 'none',
            border: isOpen ? '1px solid #e6e8e3' : 'none',
          }}
        >
          {!isOpen && (
            <span className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(16,185,129,0.15)' }} />
          )}
          <span className="relative pointer-events-none">{isOpen ? '✕' : currentMode.icon}</span>
        </button>
      </div>
    </>
  )
}
