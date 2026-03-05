from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional

from app.services.ai_service import AIService
from app.utils.prompt import build_interviewer_prompt
from app.utils.response import success_response, error_response

router = APIRouter()
ai_service = AIService()


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[Message] = []
    resume_text: str = ""
    model: str = "qwen-plus"
    file_id: Optional[str] = Field(default=None)


@router.post("/chat")
async def chat(request: ChatRequest):
    """
    对话接口 - 非流式
    """
    if not request.message.strip():
        return error_response("消息不能为空", status_code=400)

    try:
        # 构建系统 Prompt
        system_prompt = build_interviewer_prompt(
            resume_text=request.resume_text,
            model_strategy=request.model
        )

        # 构建消息历史
        messages = [{"role": "system", "content": system_prompt}]

        for msg in request.history:
            messages.append({"role": msg.role, "content": msg.content})

        messages.append({"role": "user", "content": request.message})

        # 调用 AI 服务
        content = ai_service.chat(messages, request.model)

        return success_response({"content": content})

    except Exception as e:
        return error_response(f"对话失败：{str(e)}", status_code=500)


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    对话接口 - 流式响应
    """
    if not request.message.strip():
        return error_response("消息不能为空", status_code=400)

    try:
        # 构建系统 Prompt
        system_prompt = build_interviewer_prompt(
            resume_text=request.resume_text,
            model_strategy=request.model
        )

        # 构建消息历史
        messages = [{"role": "system", "content": system_prompt}]

        for msg in request.history:
            messages.append({"role": msg.role, "content": msg.content})

        messages.append({"role": "user", "content": request.message})

        # 调用 AI 服务 - 流式响应
        return StreamingResponse(
            ai_service.chat_stream(messages, request.model),
            media_type="text/event-stream"
        )

    except Exception as e:
        # 流式错误处理
        async def error_stream():
            yield f"data: 错误：{str(e)}\n\n"
            yield "data: [DONE]\n\n"
        
        return StreamingResponse(
            error_stream(),
            media_type="text/event-stream"
        )


@router.get("/models")
async def get_models():
    """获取可用模型列表"""
    models = [
        {"id": "qwen-turbo", "name": "Qwen Turbo", "description": "快速响应，适合简单测试"},
        {"id": "qwen-plus", "name": "Qwen Plus", "description": "平衡速度与质量，推荐默认"},
        {"id": "qwen-max", "name": "Qwen Max", "description": "复杂逻辑推理，适合深度面试"},
    ]
    return success_response(models)
