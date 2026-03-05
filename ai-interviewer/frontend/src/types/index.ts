export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  isTyping?: boolean
}

export interface ResumeInfo {
  fileId: string
  filename: string
  preview: string
}

export interface Model {
  id: string
  name: string
  description: string
}

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}