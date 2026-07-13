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
          <label className="block text-sm font-medium text-gray-300 mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full rounded-xl border px-4 py-2.5 text-sm text-white placeholder-gray-500 transition-all duration-200 focus:outline-none ${
            error ? 'border-red-500 focus:ring-2 focus:ring-red-500/30' : 'border-gray-600 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400'
          } ${className}`}
          style={{
            background: 'rgba(30, 41, 59, 0.6)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
