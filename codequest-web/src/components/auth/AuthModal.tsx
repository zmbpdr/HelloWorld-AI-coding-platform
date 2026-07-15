import { useState } from 'react'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

const FEATURES = [
  { icon: '🎯', title: '编程大陆', desc: '14门编程语言，258关课程' },
  { icon: '🧠', title: '智能体工坊', desc: 'AI/ML 学习路线' },
  { icon: '🤖', title: 'AI 导师', desc: '实时代码评测与指导' },
  { icon: '🏆', title: '成就系统', desc: '解锁徽章，攀登排行榜' },
]

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.08), rgba(0,0,0,0.85))',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <div
        className="relative w-full max-w-4xl flex overflow-hidden shadow-2xl"
        style={{
          background: 'rgba(15,19,34,0.92)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(99,102,241,0.15)',
          borderRadius: 28,
          boxShadow: '0 0 80px rgba(99,102,241,0.1), 0 0 160px rgba(99,102,241,0.05)',
          maxHeight: '90vh',
        }}
      >
        {/* 左侧品牌信息 */}
        <div
          className="hidden md:flex w-[45%] flex-col justify-between p-10"
          style={{
            background: 'linear-gradient(180deg, rgba(30,27,75,0.6) 0%, rgba(15,23,42,0.8) 100%)',
            borderRight: '1px solid rgba(99,102,241,0.1)',
          }}
        >
          <div>
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                <span className="text-white font-bold text-sm">{'</>'}</span>
              </div>
              <span className="text-xl font-bold" style={{ color: '#f1f5f9' }}>Hello World</span>
            </div>

            {/* 标语 */}
            <h1 className="text-3xl font-bold leading-tight mb-3" style={{ color: '#f8fafc' }}>
              在代码的宇宙中<br />探索无限可能
            </h1>
            <p className="text-sm leading-relaxed mb-10" style={{ color: '#94a3b8' }}>
              从入门到精通，通过实践闯关掌握编程与人工智能
            </p>

            {/* 特色功能 */}
            <div className="space-y-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 mt-0.5"
                    style={{ background: 'rgba(99,102,241,0.12)' }}
                  >
                    {f.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>{f.title}</div>
                    <div className="text-xs" style={{ color: '#64748b' }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 底部统计 */}
          <div className="flex gap-6 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <div className="text-xl font-bold" style={{ color: '#818cf8' }}>14</div>
              <div className="text-xs" style={{ color: '#475569' }}>编程语言</div>
            </div>
            <div>
              <div className="text-xl font-bold" style={{ color: '#818cf8' }}>258</div>
              <div className="text-xs" style={{ color: '#475569' }}>闯关课程</div>
            </div>
            <div>
              <div className="text-xl font-bold" style={{ color: '#818cf8' }}>4</div>
              <div className="text-xs" style={{ color: '#475569' }}>智能体主线</div>
            </div>
          </div>
        </div>

        {/* 右侧表单 */}
        <div className="flex-1 relative flex flex-col overflow-y-auto" style={{ maxHeight: '90vh' }}>
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-lg transition-colors z-10"
            style={{ color: '#475569' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#e2e8f0' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#475569' }}
          >
            ✕
          </button>

          <div className="flex-1 flex items-center justify-center p-8 md:p-10">
            <div className="w-full max-w-sm">
              {mode === 'login' ? (
                <LoginForm onSuccess={onClose} onSwitchToRegister={() => setMode('register')} />
              ) : (
                <RegisterForm onSuccess={onClose} onSwitchToLogin={() => setMode('login')} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
