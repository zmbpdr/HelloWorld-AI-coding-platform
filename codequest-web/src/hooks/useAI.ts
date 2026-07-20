import { useState, useCallback, useRef, useEffect } from 'react'
import { sendChatMessage, type ChatMessage, type ChatRequest, type AIMode } from '../api/ai'
import apiClient from '../api/client'

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
  const [mode, setMode] = useState<AIMode>('tutor')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef(false)
  const lessonRef = useRef(lessonId)
  const modeRef = useRef<AIMode>(mode)

  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { lessonRef.current = lessonId }, [lessonId])

  // 加载后端历史
  useEffect(() => {
    apiClient.get('/ai/history').then(res => {
      const histories = res.data?.history || []
      const match = histories.find((h: any) => h.lesson_id === lessonId)
      setMessages(match?.messages?.slice(-MAX_HISTORY) || [])
    }).catch(() => {})
  }, [lessonId])

  // 每次消息更新时保存到后端
  const persist = useCallback(async (msgs: ChatMessage[]) => {
    try {
      await apiClient.post('/ai/history', { lesson_id: lessonRef.current, messages: msgs.slice(-MAX_HISTORY) })
    } catch { /* ignore */ }
  }, [])

  const sendMessage = useCallback(async (message: string, context?: ChatRequest['context']) => {
    setIsLoading(true)
    setError(null)
    abortRef.current = false

    const updated = [...messages, { role: 'user' as const, content: message }]
    setMessages(updated)

    try {
      const response = await sendChatMessage({ message, mode: modeRef.current, context })
      if (!abortRef.current) {
        const final = [...updated, { role: 'assistant' as const, content: response.reply }]
        setMessages(final)
        persist(final)
      }
    } catch (err: unknown) {
      if (!abortRef.current) {
        const msg = err instanceof Error ? err.message : 'AI服务异常'
        setError(msg)
        const final = [...updated, { role: 'assistant' as const, content: '抱歉，AI服务暂时不可用，请稍后再试。' }]
        setMessages(final)
        persist(final)
      }
    } finally {
      setIsLoading(false)
    }
  }, [messages, persist])

  const clearMessages = useCallback(() => {
    abortRef.current = true
    setMessages([])
    setError(null)
    apiClient.delete(`/ai/history?lesson_id=${lessonRef.current || ''}`).catch(() => {})
  }, [])

  return { messages, isLoading, error, mode, setMode, sendMessage, clearMessages }
}
