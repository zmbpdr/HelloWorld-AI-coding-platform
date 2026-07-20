import { useState } from 'react'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'

interface AuthModalProps { isOpen: boolean; onClose: () => void }

const FEATURES = [
  { icon: '🎯', title: '编程大陆', desc: '14门编程语言，258关课程' },
  { icon: '🧠', title: '智能体工坊', desc: 'AI/ML 学习路线' },
  { icon: '🤖', title: '小智', desc: '实时代码评测与指导' },
  { icon: '🏆', title: '成就系统', desc: '解锁徽章，攀登排行榜' },
]

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
      <div className="relative w-full max-w-4xl flex overflow-hidden shadow-2xl"
        style={{ background: '#ffffff', border: '1px solid #e6e8e3', borderRadius: 28, boxShadow: '0 0 80px rgba(16,185,129,0.05), 0 0 160px rgba(16,185,129,0.03)', maxHeight: '90vh' }}>
        {/* 左侧品牌信息 */}
        <div className="hidden md:flex w-[45%] flex-col justify-between p-10"
          style={{ background: 'linear-gradient(180deg, #ecfdf5 0%, #f0fdf4 100%)', borderRight: '1px solid #a7f3d0' }}>
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <span className="text-white font-bold text-sm">{'</>'}</span>
              </div>
              <span className="text-xl font-bold" style={{ color: '#1e293b' }}>Hello World</span>
            </div>
            <h1 className="text-3xl font-bold leading-tight mb-3" style={{ color: '#1e293b' }}>在代码的宇宙中<br />探索无限可能</h1>
            <p className="text-sm leading-relaxed mb-10" style={{ color: '#475569' }}>从入门到精通，通过实践闯关掌握编程与人工智能</p>
            <div className="space-y-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 mt-0.5" style={{ background: '#d1fae5' }}>{f.icon}</div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: '#1e293b' }}>{f.title}</div>
                    <div className="text-xs" style={{ color: '#64748b' }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-6 pt-6" style={{ borderTop: '1px solid #a7f3d0' }}>
            {[{ n: 14, l: '编程语言' }, { n: 258, l: '闯关课程' }, { n: 4, l: '智能体主线' }].map(s => (
              <div key={s.l}><div className="text-xl font-bold" style={{ color: '#059669' }}>{s.n}</div><div className="text-xs" style={{ color: '#64748b' }}>{s.l}</div></div>
            ))}
          </div>
        </div>

        <div className="flex-1 relative flex flex-col overflow-y-auto" style={{ maxHeight: '90vh' }}>
          <button onClick={onClose} className="absolute top-5 right-5 text-lg transition-colors z-10" style={{ color: '#94a3b8' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#1e293b' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8' }}>✕</button>
          <div className="flex-1 flex items-center justify-center p-8 md:p-10">
            <div className="w-full max-w-sm">
              {mode === 'login' ? <LoginForm onSuccess={onClose} onSwitchToRegister={() => setMode('register')} /> : <RegisterForm onSuccess={onClose} onSwitchToLogin={() => setMode('login')} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
