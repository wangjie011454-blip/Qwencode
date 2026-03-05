import { create } from 'zustand'
import type { Message, Model } from '@/types'

interface InterviewState {
  // 简历相关
  resumeText: string
  resumeFileId: string
  resumeFilename: string
  setResumeText: (text: string) => void
  setResumeFileId: (fileId: string) => void
  setResumeFilename: (filename: string) => void

  // 对话相关
  messages: Message[]
  addMessage: (message: Message) => void
  updateLastMessage: (content: string, isTyping?: boolean) => void
  setMessageTyping: (isTyping: boolean) => void
  clearMessages: () => void

  // 面试状态
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  interviewStarted: boolean
  setInterviewStarted: (started: boolean) => void

  // 模型选择
  selectedModel: Model
  setSelectedModel: (model: Model) => void

  // 重置
  clearInterview: () => void
}

const defaultModels: Model[] = [
  { id: 'qwen-turbo', name: 'Qwen Turbo', description: '快速响应' },
  { id: 'qwen-plus', name: 'Qwen Plus', description: '平衡模式' },
  { id: 'qwen-max', name: 'Qwen Max', description: '深度推理' },
]

export const useInterviewStore = create<InterviewState>((set) => ({
  // 简历相关
  resumeText: '',
  resumeFileId: '',
  resumeFilename: '',
  setResumeText: (text) => set({ resumeText: text }),
  setResumeFileId: (fileId) => set({ resumeFileId: fileId }),
  setResumeFilename: (filename) => set({ resumeFilename: filename }),

  // 对话相关
  messages: [],
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  updateLastMessage: (content, isTyping = true) => set((state) => ({
    messages: state.messages.map((msg, idx) =>
      idx === state.messages.length - 1
        ? { ...msg, content, isTyping }
        : msg
    )
  })),
  setMessageTyping: (isTyping) => set((state) => ({
    messages: state.messages.map((msg, idx) =>
      idx === state.messages.length - 1
        ? { ...msg, isTyping }
        : msg
    )
  })),
  clearMessages: () => set({ messages: [] }),

  // 面试状态
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  interviewStarted: false,
  setInterviewStarted: (started) => set({ interviewStarted: started }),

  // 模型选择
  selectedModel: defaultModels[1],
  setSelectedModel: (model) => set({ selectedModel: model }),

  // 重置
  clearInterview: () => set({
    resumeText: '',
    resumeFileId: '',
    resumeFilename: '',
    messages: [],
    interviewStarted: false,
    isLoading: false,
  }),
}))