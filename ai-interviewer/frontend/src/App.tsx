import { useState } from 'react'
import { toast } from 'sonner'
import Header from './components/Header'
import ResumeUpload from './components/ResumeUpload'
import ChatInterface from './components/ChatInterface'
import { useInterviewStore } from './store/interviewStore'

function App() {
  const { resumeText, setResumeText, clearInterview } = useInterviewStore()
  const [isUploading, setIsUploading] = useState(false)

  const handleResumeUploaded = (text: string) => {
    setResumeText(text)
    toast.success('简历上传成功，面试即将开始')
  }

  const handleRestart = () => {
    if (confirm('确定要重新开始面试吗？')) {
      clearInterview()
      toast.info('已重新开始')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-cyber-dark relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="cyber-grid-bg" />
        <div className="gradient-orb gradient-orb-1" />
        <div className="gradient-orb gradient-orb-2" />
        <div className="gradient-orb gradient-orb-3" />
      </div>

      {/* Scan Line Effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="scan-line" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header onRestart={handleRestart} />

        <main className="flex-1 container mx-auto max-w-5xl px-4 py-6">
          {!resumeText ? (
            <ResumeUpload
              onUploaded={handleResumeUploaded}
              isUploading={isUploading}
              setIsUploading={setIsUploading}
            />
          ) : (
            <ChatInterface />
          )}
        </main>

        {/* Footer */}
        <footer className="relative z-10 py-6 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
            <span className="font-mono text-xs tracking-wider">AI INTERVIEWER</span>
            <span className="text-neon-cyan">•</span>
            <span className="font-mono text-xs">2026</span>
            <span className="text-neon-cyan">•</span>
            <span className="font-mono text-xs tracking-wider">POWERED BY ALIYUN BAILIAN</span>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default App