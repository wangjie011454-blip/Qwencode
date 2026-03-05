import os
import json
from pathlib import Path
from typing import List, Dict, AsyncGenerator
from dotenv import load_dotenv
import dashscope
from dashscope import Generation

# 加载 .env 文件
env_path = Path(__file__).resolve().parent.parent.parent / '.env'
load_dotenv(env_path)


class AIService:
    """阿里云百炼 AI 服务"""

    # 模型映射
    MODELS = {
        "qwen-turbo": "qwen-turbo",
        "qwen-plus": "qwen-plus",
        "qwen-max": "qwen-max",
    }

    def __init__(self):
        self.api_key = os.getenv("DASHSCOPE_API_KEY")

    def chat(
        self,
        messages: List[Dict[str, str]],
        model: str = "qwen-plus",
        api_key: str = None
    ) -> str:
        """
        非流式对话

        Args:
            messages: 消息列表
            model: 模型名称
            api_key: API Key

        Returns:
            生成的文本
        """
        key = api_key or self.api_key
        if not key:
            raise ValueError("未提供 API Key")

        dashscope.api_key = key

        model_id = self.MODELS.get(model, model)

        response = Generation.call(
            model=model_id,
            messages=messages,
            result_format="message",
            stream=False
        )

        if response.status_code == 200:
            output = response.output
            choices = output.get("choices", [])
            if choices:
                return choices[0].get("message", {}).get("content", "")
            return ""
        else:
            raise Exception(f"API 错误：{response.message}")

    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        model: str = "qwen-plus",
        api_key: str = None
    ) -> AsyncGenerator[str, None]:
        """
        流式对话 - 使用 SSE 格式输出

        Args:
            messages: 消息列表
            model: 模型名称
            api_key: API Key

        Yields:
            SSE 格式的内容片段：data: {content}\n\n
        """
        key = api_key or self.api_key
        if not key:
            raise ValueError("未提供 API Key")

        dashscope.api_key = key

        model_id = self.MODELS.get(model, model)

        try:
            # 调用流式 API
            responses = Generation.call(
                model=model_id,
                messages=messages,
                result_format="message",
                stream=True,
                incremental_output=False  # 返回完整内容，自己计算增量
            )

            last_content = ""
            for response in responses:
                if response.status_code == 200:
                    output = response.output
                    choices = output.get("choices", [])
                    if choices:
                        content = choices[0].get("message", {}).get("content", "")
                        if content and content != last_content:
                            # 计算增量部分
                            new_part = content[len(last_content):]
                            if new_part:
                                # SSE 格式输出
                                yield f"data: {new_part}\n\n"
                            last_content = content
                else:
                    yield f"data: 错误：{response.message}\n\n"

            # 结束标记
            yield "data: [DONE]\n\n"

        except Exception as e:
            yield f"data: 异常：{str(e)}\n\n"
            yield "data: [DONE]\n\n"
