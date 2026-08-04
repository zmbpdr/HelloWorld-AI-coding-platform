/**
 * 注册表单组件 - RegisterForm
 * 功能：用户注册表单，包含用户名/邮箱/密码/确认密码输入，
 * 支持注册错误提示、密码一致性校验和切换登录。
 */
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useUserStore } from '../../stores/userStore'
import Button from '../ui/Button'
import Input from '../ui/Input'

interface RegisterFormProps { onSuccess?: () => void; onSwitchToLogin?: () => void }

/** 注册表单组件 */
export default function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const { register, isLoading, error, clearError } = useUserStore()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); clearError(); setLocalError('')
    if (password !== confirmPassword) { setLocalError('两次输入的密码不一致'); return }
    try { await register({ username, email: email || undefined, password }); onSuccess?.() } catch { /* handled in store */ }
  }

  const displayError = localError || error

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="text-center mb-1">
        <h2 className="text-2xl font-bold" style={{ color: '#1e293b' }}>创建账号</h2>
        <p className="text-sm mt-1.5" style={{ color: '#64748b' }}>开始你的 Hello World 编程之旅</p>
      </div>
      {displayError && <div className="px-4 py-2.5 rounded-xl text-sm" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>{displayError}</div>}
      <div className="space-y-4">
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#94a3b8' }}>👤</div>
          <Input type="text" value={username} autoComplete="username" onChange={(e) => setUsername(e.target.value)} placeholder="3-50个字符" required minLength={3} maxLength={50} className="pl-10" />
        </div>
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#94a3b8' }}>✉️</div>
          <Input type="email" value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com（可选）" className="pl-10" />
        </div>
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#94a3b8' }}>🔒</div>
          <Input type="password" value={password} autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} placeholder="至少8个字符" required minLength={8} className="pl-10" />
        </div>
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#94a3b8' }}>🔐</div>
          <Input type="password" value={confirmPassword} autoComplete="new-password" onChange={(e) => setConfirmPassword(e.target.value)} placeholder="再次输入密码" required className="pl-10" />
        </div>
      </div>
      <Button type="submit" isLoading={isLoading} className="w-full" size="lg">立即注册</Button>
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center"><div className="w-full" style={{ borderTop: '1px solid #e6e8e3' }}></div></div>
        <span className="relative px-3 text-xs" style={{ color: '#94a3b8', background: '#ffffff' }}>或</span>
      </div>
      <p className="text-center text-sm" style={{ color: '#64748b' }}>
        已有账号？<button type="button" onClick={onSwitchToLogin} className="font-medium ml-1 transition-colors hover:underline" style={{ color: '#059669' }}>立即登录</button>
      </p>
    </form>
  )
}
