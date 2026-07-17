import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium mb-1" style={{ color: '#334155' }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full rounded-xl border px-4 py-2.5 text-sm transition-all duration-200 focus:outline-none ${
            error ? 'border-red-300 focus:ring-2 focus:ring-red-200 focus:border-red-400' : 'border-[#e6e8e3] focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400'
          } ${className}`}
          style={{
            background: '#f4f6f1',
            color: '#1e293b',
          }}
          {...props}
        />
        {error && <p className="mt-1 text-sm" style={{ color: '#dc2626' }}>{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
