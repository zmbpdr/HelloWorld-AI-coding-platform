import apiClient from './client'

export type AIMode = 'tutor' | 'diagnostic' | 'review' | 'planning'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  message: string
  mode?: AIMode
  context?: {
    lesson_title?: string
    language?: string
    code?: string
    error?: string
  }
}

export interface ChatResponse {
  reply: string
}

/** 发送AI聊天消息（非流式） */
export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const { data } = await apiClient.post<ChatResponse>('/ai/chat', request)
  return data
}
