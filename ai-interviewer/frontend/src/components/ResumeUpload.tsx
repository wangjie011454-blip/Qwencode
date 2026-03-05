import { useState, useRef } from 'react'
import { Upload, FileText, X, CheckCircle, Sparkles, Shield, Clock } from 'lucide-react'
import { useInterviewStore } from '@/store/interviewStore'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ResumeUploadProps {
  onUploaded: (text: string) => void
  isUploading: boolean
  setIsUploading: (loading: boolean) => void
}

interface UploadResponse {
  file_id: string
  filename: string
  preview: string
  full_text: string
}

export default function ResumeUpload({ onUploaded, isUploading, setIsUploading }: ResumeUploadProps) {
  const { setResumeFileId, setResumeFilename, setResumeText: setStoreResumeText } = useInterviewStore()
  const [dragActive, setDragActive] = useState(false)
  const [previewText, setPreviewText] = useState<string | null>(null)
  const [fullText, setFullText] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      await handleFile(files[0])
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      await handleFile(files[0])
    }
  }

  const handleFile = async (file: File) => {
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
    if (!validTypes.includes(file.type)) {
      toast.error('请上传 PDF 或 Word 格式的简历')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('文件大小不能超过 10MB')
      return
    }

    setIsUploading(true)
    setFileName(file.name)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.code === 0) {
        const data = result.data as UploadResponse
        setPreviewText(data.preview)
        setFullText(data.full_text)
        setResumeFileId(data.file_id)
        setResumeFilename(data.filename)
        // 用户点击"开始面试"按钮后才调用 onUploaded
      } else {
        toast.error(result.message || '上传失败')
      }
    } catch (error) {
      toast.error('上传失败，请重试')
      console.error(error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = () => {
    setPreviewText(null)
    setFullText(null)
    setFileName(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const handleConfirm = () => {
    if (fullText) {
      setStoreResumeText(fullText)
      onUploaded(fullText)
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Hero Section */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neon-cyan/10 border border-neon-cyan/20 mb-6">
          <Sparkles className="w-4 h-4 text-neon-cyan" />
          <span className="text-sm font-mono text-neon-cyan tracking-wider">AI-POWERED INTERVIEW</span>
        </div>
        
        <h2 className="text-4xl font-display font-bold mb-4">
          <span className="text-slate-100">欢迎使用</span>
          <span className="text-neon-cyan glow-text ml-2">智能面试官</span>
        </h2>
        
        <p className="text-slate-400 text-lg max-w-md mx-auto">
          上传您的简历，开启一场专业的 AI 模拟面试体验
        </p>
      </div>

      {/* Upload Area */}
      {!previewText ? (
        <div
          className={cn(
            "relative group rounded-2xl p-1 transition-all duration-500",
            dragActive 
              ? "border-2 border-neon-cyan" 
              : "border border-cyber-border hover:border-neon-cyan/50"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {/* Glow Effect on Drag */}
          {dragActive && (
            <div className="absolute inset-0 rounded-2xl bg-neon-cyan/5 animate-pulse" />
          )}
          
          <div className={cn(
            "relative rounded-xl p-12 text-center transition-all duration-300",
            "bg-gradient-to-br from-cyber-card/80 to-cyber-darker/90",
            dragActive && "bg-neon-cyan/5"
          )}>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.doc"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex flex-col items-center gap-6">
              {isUploading ? (
                <>
                  {/* Loading State */}
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl border border-neon-cyan/30 flex items-center justify-center">
                      <div className="cyber-spinner" />
                    </div>
                    {/* Pulse Ring */}
                    <div className="absolute inset-0 rounded-2xl border border-neon-cyan/20 animate-ping" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-slate-200 mb-1">正在解析简历</p>
                    <p className="text-sm text-slate-500 font-mono">ANALYZING DOCUMENT...</p>
                  </div>
                </>
              ) : (
                <>
                  {/* Upload Icon */}
                  <div className="relative group/icon">
                    <div className="absolute inset-0 bg-neon-cyan/20 rounded-2xl blur-xl opacity-0 group-hover/icon:opacity-100 transition-opacity duration-500" />
                    <div className={cn(
                      "relative w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300",
                      "bg-gradient-to-br from-cyber-card to-cyber-dark",
                      "border border-cyber-border group-hover/icon:border-neon-cyan/50",
                      dragActive && "border-neon-cyan bg-neon-cyan/10"
                    )}>
                      {/* Corner Accents */}
                      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-neon-cyan/50" />
                      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-neon-cyan/50" />
                      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-neon-cyan/50" />
                      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-neon-cyan/50" />
                      
                      <Upload className={cn(
                        "w-8 h-8 transition-all duration-300",
                        dragActive ? "text-neon-cyan scale-110" : "text-slate-400 group-hover/icon:text-neon-cyan group-hover/icon:scale-110"
                      )} />
                    </div>
                  </div>

                  {/* Text */}
                  <div>
                    <p className="text-lg font-medium text-slate-200 mb-2">
                      拖拽简历到此处，或点击上传
                    </p>
                    <p className="text-sm text-slate-500">
                      支持 <span className="text-neon-cyan">PDF</span>、<span className="text-neon-cyan">Word</span> 格式，最大 10MB
                    </p>
                  </div>

                  {/* Upload Button */}
                  <button
                    onClick={() => inputRef.current?.click()}
                    className="primary-button px-8 py-3 rounded-xl text-sm tracking-wider relative z-10"
                  >
                    <span className="relative z-10">选择文件</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Preview Card */
        <div className="glass-card rounded-2xl overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="px-6 py-4 border-b border-cyber-border/50 flex items-center justify-between bg-gradient-to-r from-cyber-card to-transparent">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/30 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-neon-cyan" />
                </div>
                {/* Success Indicator */}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-neon-green flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 text-cyber-dark" />
                </div>
              </div>
              <div>
                <p className="font-medium text-slate-100 truncate max-w-[300px]">{fileName}</p>
                <p className="text-xs text-neon-green font-mono tracking-wider">PARSED SUCCESSFULLY</p>
              </div>
            </div>
            <button
              onClick={handleRemove}
              className="p-2 rounded-lg hover:bg-cyber-border/50 transition-colors group"
            >
              <X className="w-5 h-5 text-slate-500 group-hover:text-neon-pink transition-colors" />
            </button>
          </div>

          {/* Preview Content */}
          <div className="p-6 max-h-80 overflow-y-auto bg-cyber-darker/50">
            <pre className="whitespace-pre-wrap text-sm text-slate-300 font-mono leading-relaxed">
              {previewText}
            </pre>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-cyber-border/50 flex items-center justify-between bg-gradient-to-r from-cyber-card to-transparent">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
              <span className="text-sm text-neon-green font-medium">简历解析成功</span>
            </div>
            <button
              onClick={handleConfirm}
              className="primary-button px-8 py-2.5 rounded-xl text-sm tracking-wider"
            >
              <span className="relative z-10">开始面试</span>
            </button>
          </div>
        </div>
      )}

      {/* Feature Cards */}
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-4 card-hover">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-neon-cyan" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">智能分析</p>
              <p className="text-xs text-slate-500">深度理解简历内容</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card rounded-xl p-4 card-hover">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-neon-purple" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">隐私保护</p>
              <p className="text-xs text-slate-500">数据安全加密存储</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card rounded-xl p-4 card-hover">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neon-green/10 border border-neon-green/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-neon-green" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">高效面试</p>
              <p className="text-xs text-slate-500">15-30 分钟完成</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}