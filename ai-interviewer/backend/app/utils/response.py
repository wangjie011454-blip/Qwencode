from typing import Any, Dict
from fastapi.responses import JSONResponse


def success_response(data: Any, message: str = "success") -> JSONResponse:
    """成功响应"""
    return JSONResponse(
        status_code=200,
        content={
            "code": 0,
            "message": message,
            "data": data
        }
    )


def error_response(message: str, status_code: int = 500, code: int = -1) -> JSONResponse:
    """错误响应"""
    return JSONResponse(
        status_code=status_code,
        content={
            "code": code,
            "message": message,
            "data": None
        }
    )