import hashlib
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.resume_parser import ResumeParser
from app.utils.response import success_response, error_response

router = APIRouter()
resume_parser = ResumeParser()

# 简单的内存存储（生产环境应使用数据库）
resume_store = {}


@router.post("/upload")
async def upload_resume(file: UploadFile = File(...)):
    """
    上传简历文件并解析
    支持 PDF 和 Word 格式
    """
    if file.size and file.size > 10 * 1024 * 1024:
        return error_response("文件大小不能超过 10MB", status_code=400)

    file_extension = file.filename.split(".")[-1].lower()
    if file_extension not in ["pdf", "docx", "doc"]:
        return error_response("仅支持 PDF 和 Word 格式", status_code=400)

    try:
        content = await file.read()
        
        # 解析简历
        text = resume_parser.parse(content, file_extension)
        
        if not text or len(text.strip()) < 50:
            return error_response("简历内容解析失败或内容过少", status_code=400)

        # 生成唯一ID
        file_id = hashlib.md5(content).hexdigest()[:12]
        
        resume_store[file_id] = {
            "filename": file.filename,
            "content": text,
            "size": len(content)
        }

        return success_response({
            "file_id": file_id,
            "filename": file.filename,
            "preview": text[:500] + "..." if len(text) > 500 else text,
            "full_text": text
        }, "简历上传成功")

    except Exception as e:
        return error_response(f"简历解析失败: {str(e)}", status_code=500)


@router.get("/resume/{file_id}")
async def get_resume(file_id: str):
    """获取简历内容"""
    if file_id not in resume_store:
        return error_response("简历不存在", status_code=404)
    
    return success_response(resume_store[file_id])