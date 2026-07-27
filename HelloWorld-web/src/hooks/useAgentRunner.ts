import { useState, useCallback } from 'react'
import { submitAgentCode, type AgentSubmitResult } from '../api/agent'

interface UseAgentRunnerReturn {
  isRunning: boolean
  result: AgentSubmitResult | null
  error: string | null
  runCode: (nodeId: number, code: string) => Promise<AgentSubmitResult | null>
  clearResult: () => void
}

export function useAgentRunner(): UseAgentRunnerReturn {
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<AgentSubmitResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runCode = useCallback(async (nodeId: number, code: string) => {
    setIsRunning(true)
    setError(null)
    try {
      const submitResult = await submitAgentCode(nodeId, code)
      setResult(submitResult)
      return submitResult
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '提交失败'
      setError(message)
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
