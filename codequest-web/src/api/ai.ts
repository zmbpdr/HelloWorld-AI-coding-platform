import apiClient from './client'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  message: string
  context?: {
    lesson_title?: string
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
