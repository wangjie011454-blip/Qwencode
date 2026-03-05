import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

# 加载 .env 文件
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

from app.routes import chat, upload
import dashscope

# 设置 API Key
DASHSCOPE_API_KEY = os.getenv("DASHSCOPE_API_KEY")
if DASHSCOPE_API_KEY:
    dashscope.api_key = DASHSCOPE_API_KEY
else:
    print("警告: 未设置 DASHSCOPE_API_KEY 环境变量")


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("AI 智能面试官系统启动...")
    yield
    print("AI 智能面试官系统关闭...")


app = FastAPI(
    title="AI 智能面试官系统",
    description="基于阿里云百炼平台的AI面试系统",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api", tags=["文件上传"])
app.include_router(chat.router, prefix="/api", tags=["对话"])


@app.get("/")
async def root():
    return {"message": "AI 智能面试官系统 API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "api_key_configured": bool(DASHSCOPE_API_KEY)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)