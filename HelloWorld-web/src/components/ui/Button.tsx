import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  isLoading?: boolean
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  isLoading,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyle = 'rounded-xl font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center'

  const variants: Record<string, string> = {
    primary: 'text-white hover:-translate-y-0.5 active:translate-y-0',
    secondary: 'hover:-translate-y-0.5 active:translate-y-0',
    ghost: 'hover:bg-[#f4f6f1] active:bg-[#ecfdf5]',
  }

  const bgMap: Record<string, string> = {
    primary: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #10b981 100%)',
    secondary: '#f4f6f1',
    ghost: 'transparent',
  }

  const colorMap: Record<string, string> = {
    primary: '',
    secondary: '#334155',
    ghost: '#475569',
  }

  const borderMap: Record<string, string> = {
    primary: 'none',
    secondary: '1px solid #e6e8e3',
    ghost: 'none',
  }

  const sizes: Record<string, string> = {
    sm: 'px-3.5 py-2 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  const shadowMap: Record<string, string> = {
    primary: '0 2px 12px rgba(16,185,129,0.25)',
    secondary: '',
    ghost: '',
  }

  return (
    <button
      className={`shimmer-btn ${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      style={{
        background: bgMap[variant],
        color: variant === 'primary' ? '#fff' : colorMap[variant],
        border: borderMap[variant],
        boxShadow: shadowMap[variant],
      }}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          加载中…
        </span>
      ) : children}
    </button>
  )
}
