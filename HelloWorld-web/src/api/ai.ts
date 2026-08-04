/**
 * AI 模块 API
 * 提供 AI 聊天功能的类型定义和接口调用，
 * 支持导师/诊断/审查/规划四种模式
 */
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
