import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react'
import { useAI } from '../../hooks/useAI'
import type { ChatRequest } from '../../api/ai'

interface AIChatProps {
  lessonId?: number
  context?: ChatRequest['context']
}

export default function AIChat({ lessonId, context }: AIChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const { messages, isLoading, sendMessage, clearMessages } = useAI(lessonId)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
    dragStart.current = {
      x: e.clientX, y: e.clientY,
      left: pos?.left ?? rect.left,
      top: pos?.top ?? rect.top,
    }
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
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging])

  const handleToggle = useCallback(() => {
    if (!hasMoved.current) setIsOpen(prev => !prev)
  }, [])

  const handleSend = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    const message = input.trim()
    setInput('')
    await sendMessage(message, context)
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 w-[380px] h-[520px] flex flex-col z-50 shadow-2xl"
          style={{
            background: 'rgba(15,19,34,0.95)',
            border: '1px solid rgba(99,102,241,0.15)',
            borderRadius: 20,
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* 头部 */}
          <div
            className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                🤖
              </div>
              <h3 className="font-semibold" style={{ color: '#f1f5f9' }}>AI 导师</h3>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={() => {
                    const md = messages.map(m => `**${m.role === 'user' ? '🧑 你' : '🤖 AI 导师'}**\n\n${m.content}\n`).join('\n---\n\n')
                    const blob = new Blob([`# AI 对话记录\n\n${md}`], { type: 'text/markdown' })
                    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `ai-chat-${new Date().toISOString().slice(0,10)}.md`; a.click()
                  }}
                  className="text-xs px-2 py-1 rounded-lg transition-colors"
                  style={{ color: '#94a3b8' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent' }}
                  title="导出对话为 Markdown"
                >
                  📥 导出
                </button>
              )}
              <button
                onClick={clearMessages}
                className="text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                style={{ color: '#64748b' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#cbd5e1' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b' }}
              >
                清空
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-lg px-1.5 py-1 rounded-lg transition-colors"
                style={{ color: '#64748b' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#e2e8f0' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#64748b' }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-10">
                <p className="text-3xl mb-3">👋</p>
                <p className="text-sm" style={{ color: '#64748b' }}>你好！我是你的AI编程导师</p>
                <p className="text-xs mt-1" style={{ color: '#475569' }}>有任何问题都可以问我</p>
              </div>
            )}

            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                  style={{
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                      : 'rgba(255,255,255,0.04)',
                    color: msg.role === 'user' ? '#fff' : '#cbd5e1',
                    borderBottomRightRadius: msg.role === 'user' ? 6 : undefined,
                    borderBottomLeftRadius: msg.role === 'assistant' ? 6 : undefined,
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.04)', borderBottomLeftRadius: 6 }}>
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#6366f1', animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#8b5cf6', animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#a78bfa', animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 输入框 */}
          <form onSubmit={handleSend} className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="询问AI导师关于代码的问题..."
                className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: '#f1f5f9',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed text-white"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  boxShadow: '0 2px 12px rgba(99,102,241,0.25)',
                }}
              >
                发送
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 浮动按钮 — 可拖拽 */}
      <div
        className="fixed z-50 select-none"
        style={{
          ...(pos
            ? { left: `${pos.left}px`, top: `${pos.top}px` }
            : { right: 24, bottom: 24 }),
          cursor: dragging ? 'grabbing' : 'grab',
        }}
      >
        <button
          ref={btnRef}
          onMouseDown={onMouseDown}
          onClick={handleToggle}
          className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-xl transition-all duration-300"
          title="AI 导师"
          style={{
            background: isOpen ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
            boxShadow: isOpen ? 'none' : '0 4px 24px rgba(99,102,241,0.4)',
            transform: isOpen ? 'rotate(90deg)' : 'none',
          }}
        >
          {!isOpen && (
            <span
              className="absolute inset-0 rounded-full animate-ping"
              style={{ background: 'rgba(99,102,241,0.2)' }}
            />
          )}
          <span className="relative pointer-events-none">{isOpen ? '✕' : '🤖'}</span>
        </button>
      </div>
    </>
  )
}
