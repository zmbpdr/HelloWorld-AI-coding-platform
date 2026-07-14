import { useRef, useEffect, useCallback, useState } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import type * as Monaco from 'monaco-editor'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language?: string
  readOnly?: boolean
  height?: string
  // 🆕 新增：标注数据
  decorations?: Array<{
    line: number
    message: string
    severity: 'error' | 'warning' | 'info'
  }>
}

// Monaco Editor 语言标识映射（14 种语言全覆盖）
const languageMap: Record<string, string> = {
  python: 'python',
  javascript: 'javascript',
  java: 'java',
  cpp: 'cpp',
  go: 'go',
  rust: 'rust',
  typescript: 'typescript',
  sql: 'sql',
  ruby: 'ruby',
  swift: 'swift',
  kotlin: 'kotlin',
  php: 'php',
  shell: 'shell',
  lua: 'lua',
}

function loadSetting<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored !== null ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

export default function CodeEditor({
  value,
  onChange,
  language = 'python',
  readOnly = false,
  height = '400px',
  decorations = [], // 🆕 接收标注数据
}: CodeEditorProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof Monaco | null>(null)
  const ignoreChangeRef = useRef(false)
  const decorationIdsRef = useRef<string[]>([])
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const [containerReady, setContainerReady] = useState(false)
  const [editorPixelHeight, setEditorPixelHeight] = useState(400)
  const fontSize = loadSetting<number>('codequest_editor_font_size', 14)

  const containerCallbackRef = useCallback((node: HTMLDivElement | null) => {
    setContainer(node)
    if (node) setContainerReady(true)
  }, [])

  // ResizeObserver: 测量容器实际像素高度，传给 Monaco
  useEffect(() => {
    if (!container) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.contentRect.height
        if (h > 0) {
          setEditorPixelHeight(h)
          requestAnimationFrame(() => {
            editorRef.current?.layout()
          })
        }
      }
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [container])

  // 当外部 value 变化时同步到编辑器
  useEffect(() => {
    if (!editorRef.current) return
    const editor = editorRef.current
    const currentValue = editor.getValue()
    if (value !== currentValue) {
      ignoreChangeRef.current = true
      editor.setValue(value)
      ignoreChangeRef.current = false
    }
  }, [value])

  // 🆕 当 decorations 变化时更新标注
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return

    // 清除旧标注
    if (decorationIdsRef.current.length > 0) {
      editorRef.current.deltaDecorations(decorationIdsRef.current, [])
      decorationIdsRef.current = []
    }

    // 如果没有标注，直接返回
    if (decorations.length === 0) return

    // 生成新标注
    const monaco = monacoRef.current
    const newDecorations = decorations.map((dec) => {
      const isError = dec.severity === 'error'
      const isWarning = dec.severity === 'warning'
      return {
        range: new monaco.Range(dec.line, 1, dec.line, 1),
        options: {
          isWholeLine: true,
          className: isError ? 'error-line' : isWarning ? 'warning-line' : 'info-line',
          glyphMarginClassName: isError ? 'error-glyph' : isWarning ? 'warning-glyph' : 'info-glyph',
          glyphMarginHoverMessage: { value: dec.message },
          hoverMessage: { value: dec.message },
        }
      }
    })

    decorationIdsRef.current = editorRef.current.deltaDecorations([], newDecorations)
  }, [decorations])

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    // 自定义主题
    monaco.editor.defineTheme('codequest-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#111827',
        'editor.lineHighlightBackground': '#1f2937',
      },
    })
    monaco.editor.defineTheme('codequest-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#ffffff',
        'editor.lineHighlightBackground': '#f3f4f6',
      },
    })
    const theme = loadSetting<string>('codequest_theme', 'dark')
    monaco.editor.setTheme(theme === 'light' ? 'codequest-light' : 'codequest-dark')

    requestAnimationFrame(() => {
      editor.layout()
    })
  }

  const handleChange = (newValue: string | undefined) => {
    if (ignoreChangeRef.current) return
    onChange(newValue ?? '')
  }

  // 窗口大小变化时重新 layout
  const handleResize = useCallback(() => {
    editorRef.current?.layout()
  }, [])

  useEffect(() => {
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [handleResize])

  return (
    <div
      ref={containerCallbackRef}
      className="rounded-lg overflow-hidden border border-gray-700"
      style={{ height }}
    >
      {containerReady && (
        <Editor
          key={language}
          height={editorPixelHeight}
          language={languageMap[language] || 'python'}
          defaultValue={value}
          onChange={handleChange}
          onMount={handleMount}
          loading={<div className="flex items-center justify-center h-full bg-gray-900 rounded-xl"><div className="skeleton-shimmer h-full w-full rounded-xl" /></div>}
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize,
            fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
            lineNumbers: 'on',
            // 🆕 开启行号左侧标记区域
            glyphMargin: true,
            scrollBeyondLastLine: false,
            automaticLayout: false,
            tabSize: 4,
            wordWrap: 'on',
            padding: { top: 12, bottom: 12 },
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
          }}
        />
      )}
    </div>
  )
}