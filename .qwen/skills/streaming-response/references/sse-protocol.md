# SSE (Server-Sent Events) 协议详解

## 概述

SSE 是一种服务器向客户端推送实时数据的技术，基于 HTTP 长连接，单向通信（服务器→客户端）。

## 适用场景

✅ **适合使用 SSE**
- AI 对话流式输出
- 实时通知推送
- 股票/数据实时更新
- 进度条实时更新
- 日志流式展示

❌ **不适合 SSE**
- 需要双向通信（使用 WebSocket）
- 低延迟游戏（使用 WebSocket）
- 文件上传（使用普通 HTTP）

## 协议格式

### 基本消息格式

```
data: 消息内容\n\n
```

### 完整消息格式

```
event: message-type
data: 消息内容
id: message-id
retry: 3000

```

### 字段说明

| 字段 | 说明 | 是否必需 |
|------|------|----------|
| data | 消息数据，可多行 | 必需 |
| event | 事件类型，触发对应回调 | 可选 |
| id | 消息 ID，用于断线重连 | 可选 |
| retry | 重连时间（毫秒） | 可选 |

### 多行 data 示例

```
data: 第一行
data: 第二行
data: 第三行

```

客户端接收到的内容：
```
第一行
第二行
第三行
```

## 后端实现

### FastAPI (Python)

```python
from fastapi.responses import StreamingResponse

@app.get("/stream")
async def stream():
    async def generator():
        for i in range(10):
            yield f"data: {i}\n\n"
    
    return StreamingResponse(
        generator(),
        media_type="text/event-stream"
    )
```

### Node.js (Express)

```javascript
app.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const interval = setInterval(() => {
    res.write(`data: ${Date.now()}\n\n`);
  }, 1000);
  
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});
```

### Go (Gin)

```go
func stream(c *gin.Context) {
    c.Header("Content-Type", "text/event-stream")
    c.Header("Cache-Control", "no-cache")
    c.Header("Connection", "keep-alive")
    
    for i := 0; i < 10; i++ {
        c.Writer.WriteString(fmt.Sprintf("data: %d\n\n", i))
        c.Writer.Flush()
        time.Sleep(time.Second)
    }
}
```

## 前端实现

### 使用 EventSource (仅 GET)

```javascript
const eventSource = new EventSource('/api/stream');

eventSource.onmessage = (event) => {
  console.log('收到消息:', event.data);
};

eventSource.addEventListener('custom-event', (event) => {
  console.log('自定义事件:', event.data);
});

eventSource.onerror = (error) => {
  console.error('连接错误:', error);
  eventSource.close();
};

// 关闭连接
eventSource.close();
```

### 使用 Fetch (支持 POST)

```javascript
async function streamPost(url, data) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value, { stream: true });
    console.log('收到:', text);
  }
}
```

### 使用 AsyncGenerator

```typescript
async function* chatStream(message: string): AsyncGenerator<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop()!;

    for (const line of lines) {
      if (line.startsWith('data:')) {
        const data = line.slice(5).trim();
        if (data !== '[DONE]') {
          yield data;
        }
      }
    }
  }
}

// 使用
for await (const chunk of chatStream('hello')) {
  console.log(chunk);
}
```

## 常见 LLM API 的 SSE 格式

### OpenAI

```
data: {"id":"chat-1","choices":[{"delta":{"content":"Hello"}}]}

data: {"id":"chat-1","choices":[{"delta":{"content":" world"}}]}

data: [DONE]

```

### Anthropic

```
event: content_block_delta
data: {"delta":{"text":"Hello"}}

event: content_block_stop
data: {}

```

### Azure OpenAI

```
data: {"choices":[{"delta":{"content":"Hello"},"index":0}]}

data: {"choices":[{"delta":{},"finish_reason":"stop"}]}

```

## 错误处理

### 后端错误流

```python
async def error_stream(error_msg: str):
    yield f"data: {error_msg}\n\n"
    yield "data: [DONE]\n\n"
```

### 前端错误处理

```typescript
try {
  for await (const chunk of chatStream(message)) {
    // 处理正常数据
  }
} catch (error) {
  // 网络错误
  console.error('请求失败:', error);
}

// 检查数据中的错误标记
if (chunk.startsWith('错误:')) {
  showError(chunk.replace('错误:', ''));
}
```

## 性能优化

### 1. 缓冲处理

```typescript
let buffer = '';
const lines = buffer.split('\n');
buffer = lines.pop()!; // 保留不完整行
```

### 2. 防抖更新

```typescript
// 避免频繁 React 渲染
const [content, setContent] = useState('');
const bufferRef = useRef('');

useEffect(() => {
  const timer = setTimeout(() => {
    setContent(bufferRef.current);
  }, 16); // ~60fps
  return () => clearTimeout(timer);
}, [chunk]);
```

### 3. 超时设置

```python
from aiohttp import ClientTimeout

timeout = ClientTimeout(
    total=60,      # 总超时
    sock_connect=10,  # 连接超时
    sock_read=30      # 读取超时
)
```

## 调试技巧

### 1. 打印原始数据

```typescript
console.log('原始数据:', line);
console.log('解析后:', data);
```

### 2. 检查响应头

```typescript
console.log('Content-Type:', response.headers.get('content-type'));
// 应该是 text/event-stream
```

### 3. 使用 curl 测试

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"hello"}' \
  -N
```

## 常见问题

### Q: SSE 和 WebSocket 有什么区别？

| 特性 | SSE | WebSocket |
|------|-----|-----------|
| 方向 | 单向（服务器→客户端） | 双向 |
| 协议 | HTTP | WebSocket |
| 数据格式 | 文本 | 二进制/文本 |
| 浏览器支持 | 较好 | 好 |
| 适用场景 | 推送、流式 | 实时交互 |

### Q: 如何处理断线重连？

```javascript
const eventSource = new EventSource('/stream');

eventSource.onerror = () => {
  setTimeout(() => {
    eventSource.reconnect(); // 或重新创建
  }, 3000);
};
```

### Q: 如何发送自定义事件？

```python
yield f"event: progress\n"
yield f"data: 50%\n\n"
```

```javascript
eventSource.addEventListener('progress', (e) => {
  console.log('进度:', e.data);
});
```
