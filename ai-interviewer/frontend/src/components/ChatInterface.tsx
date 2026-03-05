import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, User, Bot, Loader2, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useInterviewStore } from '@/store/interviewStore'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { chatStream } from '@/lib/stream'

export default function ChatInterface() {
  const {
    messages,
    addMessage,
    updateLastMessage,
    resumeText,
    selectedModel,
    isLoading,
    setIsLoading,
  } = useInterviewStore()

  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto resize textarea
  useEffect(() => {
    const textarea = inputRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 52), 120)
      textarea.style.height = `${newHeight}px`
    }
  }, [input])

  const handleSendMessage = useCallback(async (text?: string) => {
    const messageText = text || input.trim()
    if (!messageText || isLoading) return

    // Add user message
    addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: messageText,
    })

    if (!text) {
      setInput('')
      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = '52px'
      }
    }

    // Add AI message placeholder
    addMessage({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      isTyping: true,
    })

    setIsLoading(true)

    try {
      const history = messages.map(m => ({
        role: m.role,
        content: m.content,
      }))

      // 使用流式请求
      const request = {
        message: messageText,
        history,
        resume_text: resumeText,
        model: selectedModel.id,
      }

      let fullContent = ''

      // 消费流式响应
      for await (const chunk of chatStream(request)) {
        fullContent += chunk
        updateLastMessage(fullContent, true)
      }

      // 流式结束，关闭光标
      updateLastMessage(fullContent, false)

    } catch (error) {
      console.error('Chat error:', error)
      updateLastMessage('抱歉，发生了一些错误，请重试', false)
      toast.error('对话失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }, [input, messages, resumeText, selectedModel, isLoading])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] animate-fade-in">
      {/* Empty State */}
      {messages.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-neon-cyan/20 rounded-2xl blur-2xl animate-pulse" />
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-cyber-card to-cyber-dark border border-neon-cyan/30 flex items-center justify-center">
                <Bot className="w-10 h-10 text-neon-cyan" />
              </div>
            </div>
            <p className="text-slate-400 font-mono tracking-wider">INITIALIZING INTERVIEW...</p>
          </div>
        </div>
      )}

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto space-y-6 px-2 py-4">
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-4 animate-slide-up",
              message.role === 'user' && "flex-row-reverse"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className={cn(
                "relative w-10 h-10 rounded-xl flex items-center justify-center",
                message.role === 'user'
                  ? "bg-gradient-to-br from-neon-cyan/20 to-neon-cyan/5 border border-neon-cyan/30"
                  : "bg-gradient-to-br from-neon-purple/20 to-neon-purple/5 border border-neon-purple/30"
              )}>
                {message.role === 'user' ? (
                  <User className="w-5 h-5 text-neon-cyan" />
                ) : (
                  <Bot className="w-5 h-5 text-neon-purple" />
                )}
                {/* Glow Effect */}
                <div className={cn(
                  "absolute inset-0 rounded-xl blur-lg opacity-50",
                  message.role === 'user' ? "bg-neon-cyan/20" : "bg-neon-purple/20"
                )} />
              </div>
            </div>

            {/* Message Content */}
            <div className={cn(
              "flex-1 max-w-[80%]",
              message.role === 'user' && "flex flex-col items-end"
            )}>
              <div className={cn(
                "rounded-2xl transition-all duration-300",
                message.role === 'user'
                  ? "message-user px-5 py-4"
                  : message.content
                    ? "message-assistant px-5 py-4"
                    : "message-assistant px-4 py-3"
              )}>
                {message.role === 'assistant' ? (
                  <div className="markdown-content">
                    {message.content ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '')
                            const isInline = !match
                            return isInline ? (
                              <code className={className} {...props}>{children}</code>
                            ) : (
                              <SyntaxHighlighter
                                style={oneDark}
                                language={match[1]}
                                PreTag="div"
                                customStyle={{
                                  background: 'rgba(0, 0, 0, 0.4)',
                                  border: '1px solid rgba(0, 245, 255, 0.1)',
                                  borderRadius: '8px',
                                }}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            )
                          }
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      <div className="inline-flex items-center gap-2 whitespace-nowrap">
                        <Loader2 className="w-4 h-4 animate-spin text-neon-purple" />
                        <span className="text-slate-500">思考中...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-slate-100 leading-relaxed">{message.content}</p>
                )}
              </div>

              {/* Timestamp - outside the message bubble, bottom-right */}
              <div className="mt-1.5 text-xs text-slate-600 font-mono">
                {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="mt-4">
        <div className="glass-card rounded-2xl p-2">
          <div className="flex gap-3 items-end">
            {/* Input Container */}
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入您的回答..."
                className={cn(
                  "w-full px-5 py-3.5 bg-cyber-darker/50 border border-cyber-border rounded-xl resize-none focus:outline-none focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/10 text-slate-200 placeholder-slate-600 transition-all duration-300",
                  isLoading && "typing-cursor-input"
                )}
                style={{ minHeight: '52px', maxHeight: '120px', height: '52px', overflowY: 'auto' }}
              />

              {/* Decorative Corner */}
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-neon-cyan/20 rounded-br-xl pointer-events-none" />
            </div>

            {/* Send Button */}
            <button
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || isLoading}
              className={cn(
                "relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
                input.trim() && !isLoading
                  ? "primary-button"
                  : "bg-cyber-border/50 text-slate-600 cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}

              {/* Glow Effect on Hover */}
              {input.trim() && !isLoading && (
                <div className="absolute inset-0 rounded-xl bg-neon-cyan/20 blur-lg opacity-0 hover:opacity-100 transition-opacity duration-300" />
              )}
            </button>
          </div>

          {/* Hint */}
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-slate-600">
            <span className="font-mono">
              <span className="text-neon-cyan/50">ENTER</span> 发送
            </span>
            <span className="text-cyber-border">|</span>
            <span className="font-mono">
              <span className="text-neon-cyan/50">SHIFT + ENTER</span> 换行
            </span>
          </div>
        </div>

        {/* AI Status Indicator */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 mt-3 text-sm text-slate-500 animate-fade-in">
            <Sparkles className="w-4 h-4 text-neon-purple animate-pulse" />
            <span className="font-mono text-xs tracking-wider">AI IS THINKING...</span>
          </div>
        )}
      </div>
    </div>
  )
}