import { useState, useCallback, useRef, useEffect } from 'react'
import { sendChatMessage, type ChatMessage, type ChatRequest, type AIMode } from '../api/ai'

const HISTORY_KEY = 'codequest_ai_history'
const MAX_HISTORY = 50

interface UseAIReturn {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  mode: AIMode
  setMode: (mode: AIMode) => void
  sendMessage: (message: string, context?: ChatRequest['context']) => Promise<void>
  clearMessages: () => void
}

export function useAI(lessonId?: number): UseAIReturn {
  const historyKey = lessonId ? `${HISTORY_KEY}_${lessonId}` : HISTORY_KEY
  const [mode, setMode] = useState<AIMode>('tutor')

  const loadScoped = (): ChatMessage[] => {
    try {
      const stored = localStorage.getItem(historyKey)
      if (!stored) return []
      const parsed = JSON.parse(stored)
      return Array.isArray(parsed) ? parsed.slice(-MAX_HISTORY) : []
    } catch { return [] }
  }

  const [messages, setMessages] = useState<ChatMessage[]>(loadScoped)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef(false)
  const keyRef = useRef(historyKey)
  const modeRef = useRef<AIMode>(mode)

  // keep modeRef in sync
  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  // 切换课程时重新加载对应历史
  useEffect(() => {
    keyRef.current = historyKey
    setMessages(loadScoped())
    setError(null)
  }, [lessonId])

  // 每次消息更新时持久化
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(keyRef.current, JSON.stringify(messages.slice(-MAX_HISTORY)))
      } catch { /* storage full */ }
    }
  }, [messages])

  const sendMessage = useCallback(async (message: string, context?: ChatRequest['context']) => {
    setIsLoading(true)
    setError(null)
    abortRef.current = false

    setMessages(prev => [...prev, { role: 'user', content: message }])

    try {
      const response = await sendChatMessage({ message, mode: modeRef.current, context })
      if (!abortRef.current) {
        setMessages(prev => [...prev, { role: 'assistant', content: response.reply }])
      }
    } catch (err: unknown) {
      if (!abortRef.current) {
        const msg = err instanceof Error ? err.message : 'AI服务异常'
        setError(msg)
        setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，AI服务暂时不可用，请稍后再试。' }])
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearMessages = useCallback(() => {
    abortRef.current = true
    setMessages([])
    setError(null)
    localStorage.removeItem(keyRef.current)
  }, [])

  return { messages, isLoading, error, mode, setMode, sendMessage, clearMessages }
}
