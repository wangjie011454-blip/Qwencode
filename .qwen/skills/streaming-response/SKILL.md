---
name: streaming-response
description: 全栈流式输出 (SSE) 实现指南。使用 Server-Sent Events 实现 AI 响应的打字机效果。适用于：(1) LLM API 流式调用（OpenAI/Anthropic/阿里云百炼等），(2) 后端 Python/FastAPI StreamingResponse，(3) 前端 fetch + ReadableStream 解析，(4) React/Vue 状态同步更新，(5) 实时进度推送，(6) 日志流式展示。触发词包括：流式输出、打字机效果、SSE、Server-Sent Events、StreamingResponse、stream true、for await、AsyncGenerator 等。
---

# 流式输出 (SSE) 实现

## 概述

本技能提供完整的 Server-Sent Events (SSE) 流式输出实现方案，适用于 AI 对话、实时数据推送等场景。

## 核心架构

```
┌─────────────┐      SSE Stream      ┌─────────────┐
│   Frontend  │ ◄─────────────────── │   Backend   │
│  (React)    │      HTTP POST       │  (FastAPI)  │
└─────────────┘                      └─────────────┘
     │                                      │
     ▼                                      ▼
  fetch()                             StreamingResponse
  ReadableStream                      async generator
  AsyncGenerator                      yield chunks
```

## 后端实现 (FastAPI)

### 1. 基础流式响应

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI()

@app.post("/api/chat")
async def chat():
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream"
    )

async def generate_stream():
    """流式生成器"""
    for i in range(5):
        yield f"data: 消息片段 {i}\n\n"
    yield "data: [DONE]\n\n"
```

### 2. SSE 协议格式

```
data: 内容片段 1\n\n
data: 内容片段 2\n\n
data: [DONE]\n\n
```

**关键格式要求：**
- 每行以 `data:` 开头
- 每行以两个换行符 `\n\n` 结尾
- 使用 `[DONE]` 标记流结束

### 3. 完整后端示例

```python
import json
import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List

app = FastAPI()

class ChatRequest(BaseModel):
    message: str
    history: List[dict]
    model: str = "qwen-plus"

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """聊天接口 - 流式响应"""
    return StreamingResponse(
        generate_chat_stream(request),
        media_type="text/event-stream"
    )

async def generate_chat_stream(request: ChatRequest):
    """生成聊天流式响应"""
    api_key = os.getenv("API_KEY")
    
    # 构建消息
    messages = [
        {"role": "system", "content": "你是一个 AI 助手"},
        *request.history,
        {"role": "user", "content": request.message}
    ]
    
    try:
        import aiohttp
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": request.model,
                    "messages": messages,
                    "stream": True,
                    "temperature": 0.7
                }
            ) as response:
                async for line in response.content:
                    line = line.decode('utf-8').strip()
                    
                    if line.startswith('data:'):
                        data = line[5:].strip()
                        
                        if data == '[DONE]':
                            yield "data: [DONE]\n\n"
                            return
                        
                        try:
                            data_json = json.loads(data)
                            content = data_json['choices'][0]['delta'].get('content', '')
                            if content:
                                yield f"data: {content}\n\n"
                        except json.JSONDecodeError:
                            if data:
                                yield f"data: {data}\n\n"
                                
    except Exception as e:
        yield f"data: 错误：{str(e)}\n\n"
    
    yield "data: [DONE]\n\n"
```

### 4. 错误处理流

```python
async def generate_error_stream(error_msg: str):
    """生成错误流式响应"""
    yield f"data: {error_msg}\n\n"
    yield "data: [DONE]\n\n"

# 使用
@app.post("/api/chat")
async def chat():
    if not api_key_valid:
        return StreamingResponse(
            generate_error_stream("API Key 无效"),
            media_type="text/event-stream"
        )
```

## 前端实现 (React + TypeScript)

### 1. 流式请求客户端

```typescript
// src/api/client.ts

export async function* chatStream(
  message: string,
  history: Message[],
  model: string
): AsyncGenerator<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, model }),
  });

  if (!response.ok) {
    throw new Error('请求失败');
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

      buffer += decoder.decode(value, { stream: true });

      // 按行处理 SSE 数据
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留不完整的行

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('data:')) {
          const data = trimmedLine.slice(5).trim();

          if (data === '[DONE]') {
            return;
          }

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
```

### 2. React 组件集成

```tsx
// src/components/ChatInterface.tsx

import { useState } from 'react';
import { chatStream } from '../api/client';

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    const userMessage = { role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // 创建空助手消息
    const assistantId = Date.now();
    setMessages(prev => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', isStreaming: true }
    ]);

    let fullContent = '';

    try {
      // 消费 AsyncGenerator
      for await (const chunk of chatStream(inputValue, messages, model)) {
        fullContent += chunk;
        // 实时更新消息内容
        setMessages(prev => prev.map(msg =>
          msg.id === assistantId
            ? { ...msg, content: fullContent, isStreaming: true }
            : msg
        ));
      }

      // 流式结束
      setMessages(prev => prev.map(msg =>
        msg.id === assistantId
          ? { ...msg, isStreaming: false }
          : msg
      ));
    } catch (error) {
      setMessages(prev => prev.map(msg =>
        msg.id === assistantId
          ? { ...msg, content: '发生错误', isStreaming: false }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {messages.map(msg => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isStreaming={msg.isStreaming}
        />
      ))}
    </div>
  );
};
```

### 3. 打字机光标效果

```css
/* index.css */

.typing-cursor::after {
  content: '|';
  animation: blink 1s step-end infinite;
  color: var(--accent-color);
  margin-left: 2px;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
```

```tsx
// 消息组件
<div className={isStreaming ? 'typing-cursor' : ''}>
  {message.content}
</div>
```

## 完整数据流

```
用户输入
   │
   ▼
┌─────────────────────────────────┐
│  ChatInterface.handleSubmit()   │
│  - 添加用户消息                  │
│  - 创建空助手消息 (isStreaming)  │
└─────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────┐
│  chatStream() AsyncGenerator    │
│  - fetch POST /api/chat         │
│  - 获取 ReadableStream          │
│  - 解析 SSE 格式                 │
│  - yield 每个 chunk              │
└─────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────┐
│  for await (const chunk)        │
│  - 累积 fullContent             │
│  - updateMessage 实时更新        │
└─────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────┐
│  Message 组件渲染                │
│  - isStreaming ? 显示光标        │
│  - ReactMarkdown 解析内容        │
└─────────────────────────────────┘
```

## 关键要点

### 后端
1. 使用 `StreamingResponse` 和 `media_type="text/event-stream"`
2. 使用 `async generator` 和 `yield` 产生数据块
3. SSE 格式：`data: {content}\n\n`
4. 使用 `[DONE]` 标记结束
5. 异常处理也要通过流返回错误信息

### 前端
1. 使用 `fetch()` 获取 `ReadableStream`
2. 使用 `TextDecoder` 解码二进制数据
3. 缓冲处理不完整的数据行
4. 使用 `for await...of` 消费 AsyncGenerator
5. 实时更新 React 状态以显示进度

### 性能优化
1. 后端设置合理的超时时间
2. 前端处理网络异常和重试
3. 使用防抖处理频繁的状态更新
4. 大内容分块传输避免内存溢出

## 参考文件

- `scripts/fastapi-streaming.py` - 完整后端示例
- `scripts/react-streaming.ts` - 完整前端示例
- `references/sse-protocol.md` - SSE 协议详解
