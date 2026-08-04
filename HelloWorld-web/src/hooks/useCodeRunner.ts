/**
 * 代码运行 Hook - useCodeRunner
 * 管理代码提交运行状态，包括运行中/结果/错误状态，
 * 处理服务端返回的错误信息和 Axios 异常提取。
 */
import { useState, useCallback } from 'react'
import { submitCode, type SubmitResult } from '../api/lessons'

interface UseCodeRunnerReturn {
  isRunning: boolean
  result: SubmitResult | null
  error: string | null
  runCode: (lessonId: number, code: string) => Promise<SubmitResult | null>
  clearResult: () => void
}

export function useCodeRunner(): UseCodeRunnerReturn {
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runCode = useCallback(async (lessonId: number, code: string) => {
    setIsRunning(true)
    setError(null)
    try {
      const submitResult = await submitCode(lessonId, code)
      setResult(submitResult)
      // 即使服务端返回 200，评测结果也可能是错误——前端照样显示
      if (submitResult.status === 'error' && submitResult.stderr) {
        setError(submitResult.stderr)
      }
      return submitResult
    } catch (err: any) {
      // Axios 错误：优先提取服务端返回的 detail
      const detail = err?.response?.data?.detail
      const msg = typeof detail === 'string' ? detail
        : Array.isArray(detail) ? detail.map((e: any) => e.msg || '').join('; ')
        : err?.message || '提交失败'
      setError(msg)
      return null
    } finally {
      setIsRunning(false)
    }
  }, [])

  const clearResult = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { isRunning, result, error, runCode, clearResult }
}
