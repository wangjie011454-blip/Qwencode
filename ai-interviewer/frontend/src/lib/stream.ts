/**
 * 流式输出客户端
 * 使用 SSE (Server-Sent Events) 协议实现流式数据接收
 */

import { Message } from '@/types'

/**
 * 聊天请求参数
 */
export interface ChatRequest {
  message: string
  history: Array<{ role: string; content: string }>
  resume_text: string
  model: string
}

/**
 * 流式聊天请求
 * 使用 AsyncGenerator 实现流式数据消费
 *
 * @param request 聊天请求参数
 * @returns AsyncGenerator<string> - 流式内容生成器
 */
export async function* chatStream(request: ChatRequest): AsyncGenerator<string> {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error(`请求失败：${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('无法读取响应流')
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      // 解码二进制数据
      buffer += decoder.decode(value, { stream: true })

      // 按行处理 SSE 数据
      const lines = buffer.split('\n')
      // 保留最后一个可能不完整的行
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmedLine = line.trim()

        // 处理 SSE 格式：data: {content}
        if (trimmedLine.startsWith('data:')) {
          const data = trimmedLine.slice(5).trim()

          // 结束标记
          if (data === '[DONE]') {
            return
          }

          // 返回纯文本内容
          if (data) {
            yield data
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
