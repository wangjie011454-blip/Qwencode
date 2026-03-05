/**
 * React + TypeScript 流式输出完整示例
 * 
 * 演示如何使用 fetch + ReadableStream 实现 SSE 流式接收
 * 适用于 AI 对话、实时数据展示等场景
 * 
 * 依赖:
 * - React 18+
 * - TypeScript
 */

import { useState, useRef, useEffect, useCallback } from 'react';

// ========== 类型定义 ==========
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export interface ChatRequest {
  message: string;
  history: Message[];
  model: string;
}

// ========== 工具函数 ==========
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ========== 流式请求客户端 ==========

/**
 * 流式聊天请求
 * 使用 AsyncGenerator 实现流式数据消费
 */
export async function* chatStream(
  message: string,
  history: Message[],
  model: string,
  baseUrl = 'http://localhost:8000'
): AsyncGenerator<string> {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      history,
      model,
    }),
  });

  if (!response.ok) {
    throw new Error(`请求失败：${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('无法读取响应流');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // 解码二进制数据
      buffer += decoder.decode(value, { stream: true });

      // 按行处理 SSE 数据
      const lines = buffer.split('\n');
      // 保留最后一个可能不完整的行
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();

        // 处理 SSE 格式：data: {content}
        if (trimmedLine.startsWith('data:')) {
          const data = trimmedLine.slice(5).trim();

          if (data === '[DONE]') {
            return;
          }

          // 返回纯文本内容
          if (data) {
            yield data;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * 简化的流式请求（不需要 SSE 格式）
 * 适用于纯文本流式响应
 */
export async function* simpleStream(
  url: string,
  options: RequestInit
): AsyncGenerator<string> {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`请求失败：${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('无法读取响应流');
  }

  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      yield decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}

// ========== React Hook ==========

/**
 * 流式聊天 Hook
 * 封装流式请求的状态管理和消息更新
 */
export function useChatStream(baseUrl = 'http://localhost:8000') {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const updateMessage = useCallback((id: string, content: string, isStreaming?: boolean) => {
    setMessages(prev => prev.map(msg =>
      msg.id === id
        ? { ...msg, content, isStreaming }
        : msg
    ));
  }, []);

  const sendMessage = useCallback(async (
    content: string,
    model = 'default'
  ) => {
    if (!content.trim() || isLoading) return;

    // 添加用户消息
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };
    addMessage(userMessage);
    setIsLoading(true);
    setError(null);

    // 创建空助手消息
    const assistantId = generateId();
    addMessage({
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    });

    let fullContent = '';

    try {
      // 消费流式响应
      for await (const chunk of chatStream(content, messages, model, baseUrl)) {
        fullContent += chunk;
        updateMessage(assistantId, fullContent, true);
      }

      // 流式结束
      updateMessage(assistantId, fullContent, false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '发生未知错误';
      setError(errorMsg);
      updateMessage(assistantId, `错误：${errorMsg}`, false);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, addMessage, updateMessage, baseUrl]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  };
}

// ========== React 组件示例 ==========

/**
 * 消息气泡组件
 */
interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`message-wrapper ${isUser ? 'message-user' : 'message-assistant'}`}>
      <div className="message-content">
        <div className="message-header">
          <span className="message-sender">
            {isUser ? '你' : 'AI'}
          </span>
          <span className="message-time">
            {formatTime(message.timestamp)}
          </span>
        </div>
        <div
          className={`message-bubble ${
            message.isStreaming ? 'typing-cursor' : ''
          }`}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
};

/**
 * 聊天界面组件
 */
export const ChatInterface: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState('default');
  const { messages, isLoading, error, sendMessage, clearMessages } = useChatStream();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 自动调整文本框高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(
        textareaRef.current.scrollHeight,
        150
      ) + 'px';
    }
  }, [inputValue]);

  const handleSubmit = async () => {
    if (!inputValue.trim() || isLoading) return;
    await sendMessage(inputValue, selectedModel);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="chat-interface">
      {/* 消息列表 */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>开始对话吧...</p>
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="error-toast">
          <span>{error}</span>
          <button onClick={() => clearMessages()}>清除</button>
        </div>
      )}

      {/* 输入区域 */}
      <div className="input-area">
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="model-select"
        >
          <option value="default">默认模型</option>
          <option value="fast">快速模型</option>
          <option value="smart">智能模型</option>
        </select>

        <div className="input-box">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息，按 Enter 发送..."
            rows={1}
            className="textarea-input"
            disabled={isLoading}
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading || !inputValue.trim()}
            className="btn-send"
          >
            {isLoading ? '发送中...' : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ========== CSS 样式 (可复制到 index.css) ==========
/*
.chat-interface {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.message-wrapper {
  display: flex;
  margin-bottom: 1rem;
}

.message-user {
  justify-content: flex-end;
}

.message-assistant {
  justify-content: flex-start;
}

.message-bubble {
  padding: 0.75rem 1rem;
  border-radius: 12px;
  max-width: 70%;
  line-height: 1.5;
}

.message-user .message-bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.message-assistant .message-bubble {
  background: #f1f5f9;
  color: #1e293b;
}

.typing-cursor::after {
  content: '|';
  animation: blink 1s step-end infinite;
  color: #667eea;
  margin-left: 2px;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.input-area {
  padding: 1rem;
  border-top: 1px solid #e2e8f0;
}

.input-box {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.textarea-input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  resize: none;
  font-family: inherit;
  font-size: 0.9375rem;
}

.textarea-input:focus {
  outline: none;
  border-color: #667eea;
}

.btn-send {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
}

.btn-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-toast {
  background: #fee2e2;
  color: #dc2626;
  padding: 0.75rem 1rem;
  margin: 0.5rem 1rem;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
*/
