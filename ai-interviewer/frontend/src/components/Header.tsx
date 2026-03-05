import { useState, useEffect } from 'react'
import { RefreshCw, Cpu, ChevronDown, Zap, Brain, Sparkles } from 'lucide-react'
import { useInterviewStore } from '@/store/interviewStore'
import type { Model } from '@/types'
import { cn } from '@/lib/utils'

interface HeaderProps {
  onRestart: () => void
}

const modelOptions: Model[] = [
  { id: 'qwen-turbo', name: 'Qwen Turbo', description: '快速响应' },
  { id: 'qwen-plus', name: 'Qwen Plus', description: '平衡模式' },
  { id: 'qwen-max', name: 'Qwen Max', description: '深度推理' },
]

const modelIcons = {
  'qwen-turbo': Zap,
  'qwen-plus': Brain,
  'qwen-max': Sparkles,
}

export default function Header({ onRestart }: HeaderProps) {
  const { selectedModel, setSelectedModel, resumeFilename } = useInterviewStore()
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.model-dropdown')) {
        setShowModelDropdown(false)
      }
    }
    if (showModelDropdown) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showModelDropdown])

  const handleModelSelect = (model: Model) => {
    setSelectedModel(model)
    setShowModelDropdown(false)
  }

  const CurrentIcon = modelIcons[selectedModel.id as keyof typeof modelIcons] || Cpu

  return (
    <header className="relative z-20">
      {/* Top Glow Line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/50 to-transparent" />
      
      <div className="glass-card border-b border-cyber-border/50">
        <div className="container mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-neon-cyan/20 rounded-xl blur-xl group-hover:bg-neon-cyan/30 transition-all duration-500" />
              
              <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-cyber-card to-cyber-dark border border-neon-cyan/30 flex items-center justify-center overflow-hidden">
                {/* Animated Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/10 to-neon-purple/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <Cpu className="w-6 h-6 text-neon-cyan relative z-10 group-hover:scale-110 transition-transform duration-300" />
                
                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-neon-cyan/50" />
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-neon-cyan/50" />
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-neon-cyan/50" />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-neon-cyan/50" />
              </div>
            </div>

            <div className="flex flex-col">
              <h1 className="font-display text-lg font-bold tracking-wider">
                <span className="text-neon-cyan glow-text">AI</span>
                <span className="text-slate-200 ml-1">INTERVIEWER</span>
              </h1>
              {resumeFilename && (
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="status-dot" />
                  <p className="text-xs text-slate-400 font-mono truncate max-w-[200px]">
                    {resumeFilename}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Controls Section */}
          <div className="flex items-center gap-3">
            {/* Model Selector */}
            <div className="relative model-dropdown">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowModelDropdown(!showModelDropdown)
                }}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-300",
                  "bg-cyber-card/50 border border-cyber-border",
                  "hover:border-neon-cyan/30 hover:bg-cyber-card/80",
                  showModelDropdown && "border-neon-cyan/50 bg-cyber-card/80"
                )}
              >
                <div className="relative">
                  <CurrentIcon className={cn(
                    "w-4 h-4 transition-colors duration-300",
                    showModelDropdown || isHovering ? "text-neon-cyan" : "text-slate-400"
                  )} />
                </div>
                <span className="text-sm font-medium text-slate-200 hidden sm:block">
                  {selectedModel.name}
                </span>
                <ChevronDown className={cn(
                  "w-4 h-4 text-slate-500 transition-transform duration-300",
                  showModelDropdown && "rotate-180 text-neon-cyan"
                )} />
              </button>

              {/* Dropdown Menu */}
              {showModelDropdown && (
                <div className="absolute right-0 top-full mt-2 w-56 glass-card rounded-xl border border-neon-cyan/20 overflow-hidden animate-slide-down shadow-2xl">
                  {/* Dropdown Header */}
                  <div className="px-4 py-2 border-b border-cyber-border/50 bg-cyber-card/50">
                    <span className="text-xs font-mono text-slate-500 tracking-wider">SELECT MODEL</span>
                  </div>
                  
                  <div className="py-1">
                    {modelOptions.map((model) => {
                      const Icon = modelIcons[model.id as keyof typeof modelIcons] || Cpu
                      const isSelected = selectedModel.id === model.id
                      
                      return (
                        <button
                          key={model.id}
                          onClick={() => handleModelSelect(model)}
                          className={cn(
                            "w-full px-4 py-3 flex items-center gap-3 transition-all duration-200",
                            "hover:bg-neon-cyan/5",
                            isSelected && "bg-neon-cyan/10"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
                            isSelected 
                              ? "bg-neon-cyan/20 border border-neon-cyan/30" 
                              : "bg-cyber-border/50 border border-cyber-border"
                          )}>
                            <Icon className={cn(
                              "w-4 h-4 transition-colors duration-200",
                              isSelected ? "text-neon-cyan" : "text-slate-400"
                            )} />
                          </div>
                          <div className="flex-1 text-left">
                            <div className={cn(
                              "text-sm font-medium transition-colors duration-200",
                              isSelected ? "text-neon-cyan" : "text-slate-200"
                            )}>
                              {model.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {model.description}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-neon-cyan shadow-lg shadow-neon-cyan/50" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Restart Button */}
            <button
              onClick={onRestart}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300",
                "bg-cyber-card/50 border border-cyber-border",
                "hover:border-neon-purple/30 hover:bg-cyber-card/80",
                "text-slate-400 hover:text-neon-purple"
              )}
            >
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:block">重新开始</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}