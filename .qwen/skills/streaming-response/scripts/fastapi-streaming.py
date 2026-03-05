"""
FastAPI 流式输出完整示例

演示如何使用 StreamingResponse 实现 SSE 流式响应
适用于 AI 对话、实时数据推送等场景

运行方式:
    uvicorn fastapi-streaming:app --reload

测试端点:
    POST /api/chat
    GET /api/stream
"""

import json
import asyncio
import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

app = FastAPI(
    title="流式输出示例 API",
    description="演示 FastAPI StreamingResponse 实现 SSE",
    version="1.0.0"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ========== 数据模型 ==========
class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[Message] = Field(default_factory=list)
    model: str = "default"


class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None


# ========== 示例 1: 简单数字流 ==========
@app.get("/api/stream/numbers")
async def stream_numbers():
    """流式输出数字 1-10"""
    return StreamingResponse(
        number_generator(),
        media_type="text/event-stream"
    )


async def number_generator():
    """数字生成器"""
    for i in range(1, 11):
        yield f"data: {i}\n\n"
        await asyncio.sleep(0.3)  # 模拟延迟
    yield "data: [DONE]\n\n"


# ========== 示例 2: 模拟 AI 响应流 ==========
@app.post("/api/chat")
async def chat(request: ChatRequest):
    """
    聊天接口 - 模拟 AI 流式响应
    
    实际使用时替换为真实的 LLM API 调用
    """
    return StreamingResponse(
        simulate_ai_stream(request.message),
        media_type="text/event-stream"
    )


async def simulate_ai_stream(user_message: str):
    """模拟 AI 流式响应"""
    # 模拟思考延迟
    await asyncio.sleep(0.5)
    
    # 模拟逐字输出
    response = f"你说了：{user_message}。这是一个模拟的 AI 流式响应。"
    
    for char in response:
        yield f"data: {char}\n\n"
        await asyncio.sleep(0.05)  # 打字机效果
    
    yield "data: [DONE]\n\n"


# ========== 示例 3: 真实 LLM API 调用 ==========
@app.post("/api/llm/stream")
async def llm_stream(request: ChatRequest):
    """
    调用真实 LLM API 的流式接口
    
    需要配置环境变量:
    - LLM_API_KEY: API 密钥
    - LLM_API_URL: API 端点
    """
    api_key = os.getenv("LLM_API_KEY")
    
    if not api_key:
        return StreamingResponse(
            error_stream("未配置 LLM_API_KEY 环境变量"),
            media_type="text/event-stream"
        )
    
    return StreamingResponse(
        call_llm_api(request, api_key),
        media_type="text/event-stream"
    )


async def call_llm_api(request: ChatRequest, api_key: str):
    """调用 LLM API 并转发流式响应"""
    try:
        import aiohttp
        from aiohttp import ClientTimeout
        
        timeout = ClientTimeout(total=60, sock_connect=10, sock_read=30)
        
        # 构建消息
        messages = [
            {"role": "system", "content": "你是一个有帮助的 AI 助手。"},
            *[{"role": msg.role, "content": msg.content} for msg in request.history],
            {"role": "user", "content": request.message}
        ]
        
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(
                os.getenv("LLM_API_URL", "https://api.openai.com/v1/chat/completions"),
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": request.model,
                    "messages": messages,
                    "stream": True,
                    "temperature": 0.7,
                    "max_tokens": 1000,
                }
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    yield f"data: API 错误：{error_text}\n\n"
                    yield "data: [DONE]\n\n"
                    return
                
                async for line in response.content:
                    line = line.decode('utf-8').strip()
                    
                    if not line:
                        continue
                    
                    if line.startswith('data:'):
                        data = line[5:].strip()
                        
                        if data == '[DONE]':
                            yield "data: [DONE]\n\n"
                            return
                        
                        try:
                            data_json = json.loads(data)
                            content = extract_content(data_json)
                            if content:
                                yield f"data: {content}\n\n"
                        except json.JSONDecodeError:
                            if data:
                                yield f"data: {data}\n\n"
                                
    except ImportError:
        yield "data: 错误：请安装 aiohttp (pip install aiohttp)\n\n"
        yield "data: [DONE]\n\n"
    except Exception as e:
        yield f"data: 错误：{str(e)}\n\n"
        yield "data: [DONE]\n\n"


def extract_content(data_json: dict) -> str:
    """从 LLM 响应中提取内容"""
    if 'choices' in data_json and len(data_json['choices']) > 0:
        choice = data_json['choices'][0]
        if 'delta' in choice:
            return choice['delta'].get('content', '')
        elif 'text' in choice:
            return choice['text']
    elif 'content' in data_json:
        return data_json['content']
    return ''


# ========== 工具函数 ==========
def error_stream(error_msg: str):
    """生成错误流"""
    yield f"data: {error_msg}\n\n"
    yield "data: [DONE]\n\n"


# ========== 健康检查 ==========
@app.get("/", response_model=APIResponse)
async def root():
    """API 健康检查"""
    return APIResponse(
        success=True,
        message="流式输出 API 运行中",
        data={"version": "1.0.0"}
    )


@app.get("/api/health", response_model=APIResponse)
async def health():
    """详细健康检查"""
    return APIResponse(
        success=True,
        message="服务正常",
        data={
            "timestamp": datetime.now().isoformat(),
            "endpoints": [
                "GET /api/stream/numbers - 数字流示例",
                "POST /api/chat - 模拟 AI 聊天",
                "POST /api/llm/stream - 真实 LLM 调用"
            ]
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
