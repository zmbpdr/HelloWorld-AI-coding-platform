import { useState } from 'react'
import type { FormEvent } from 'react'
import { useUserStore } from '../../stores/userStore'
import Button from '../ui/Button'
import Input from '../ui/Input'

interface LoginFormProps {
  onSuccess?: () => void
  onSwitchToRegister?: () => void
}

export default function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const { login, isLoading, error, clearError } = useUserStore()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    clearError()
    try {
      await login({ username, password })
      onSuccess?.()
    } catch { /* handled in store */ }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="text-center mb-1">
        <h2 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>欢迎回来</h2>
        <p className="text-sm mt-1.5" style={{ color: '#64748b' }}>登录开启你的编程闯关之旅</p>
      </div>

      {error && (
        <div className="px-4 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#475569' }}>👤</div>
          <Input
            type="text"
            value={username}
            autoComplete="username"
            onChange={(e) => setUsername(e.target.value)}
            placeholder="请输入用户名"
            required
            className="pl-10"
          />
        </div>

        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#475569' }}>🔒</div>
          <Input
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
            required
            className="pl-10"
          />
        </div>
      </div>

      <Button type="submit" isLoading={isLoading} className="w-full" size="lg">
        立即登录
      </Button>

      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}></div>
        </div>
        <span className="relative px-3 text-xs" style={{ color: '#475569', background: 'rgba(15,19,34,0.92)' }}>或</span>
      </div>

      <p className="text-center text-sm" style={{ color: '#64748b' }}>
        还没有账号？
        <button type="button" onClick={onSwitchToRegister} className="font-medium ml-1 transition-colors hover:underline" style={{ color: '#818cf8' }}>
          立即注册
        </button>
      </p>
    </form>
  )
}
