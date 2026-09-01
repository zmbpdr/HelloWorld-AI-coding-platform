/**
 * MarkdownEditor.tsx - Markdown 编辑器组件
 *
 * 基于 @uiw/react-md-editor 封装，提供：
 * - 左侧编辑区 + 右侧实时预览（分屏模式）
 * - 工具栏（加粗、斜体、标题、列表、表格、代码块等）
 * - 图片粘贴/拖拽/按钮上传（集成后端 /lessons/upload-image 接口）
 * - 深色主题适配（与后台整体风格一致）
 * - 兼容 Ant Design Form.Item 的 value/onChange 受控模式
 */

import React, { useRef, useCallback } from 'react'
import MDEditor, { commands, type ICommand } from '@uiw/react-md-editor'
import '@uiw/react-md-editor/markdown-editor.css'
import { message } from 'antd'
import { PictureOutlined, FileTextOutlined } from '@ant-design/icons'
import { uploadImage, parseWordFile, parsePdfFile } from '../api/admin'

interface MarkdownEditorProps {
  /** 当前 Markdown 内容（受控） */
  value?: string
  /** 内容变更回调（受控） */
  onChange?: (value: string) => void
  /** 编辑器高度（px），默认 500 */
  height?: number
}

/** 允许上传的图片 MIME 类型 */
const ALLOWED_IMAGE_TYPES = 'image/png,image/jpeg,image/gif,image/webp'

/** 检查文件是否为图片类型 */
function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

/** 检查剪贴板项是否为图片 */
function isImageClipboardItem(item: DataTransferItem): boolean {
  return item.type.startsWith('image/')
}

export default function MarkdownEditor({
  value,
  onChange,
  height = 500,
}: MarkdownEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  /** 用 ref 保持最新 value，避免闭包过期问题 */
  const valueRef = useRef(value)
  valueRef.current = value

  /**
   * 上传图片文件，并在光标位置插入 Markdown 图片语法
   */
  const doUpload = useCallback(
    async (file: File) => {
      const hide = message.loading('图片上传中...', 0)
      try {
        const url = await uploadImage(file)
        hide()

        // 在编辑器 TextArea 的光标位置插入图片语法
        const textarea = document.querySelector(
          '.w-md-editor-text-input',
        ) as HTMLTextAreaElement | null
        if (textarea) {
          const currentValue = valueRef.current || ''
          const start = textarea.selectionStart
          const imageMd = `![${file.name}](${url})\n`
          const newValue =
            currentValue.substring(0, start) +
            imageMd +
            currentValue.substring(start)
          onChange?.(newValue)

          // 将光标移到插入内容之后
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd =
              start + imageMd.length
            textarea.focus()
          }, 0)
        }
        message.success('图片上传成功')
      } catch {
        hide()
        message.error('图片上传失败，请确认文件格式和大小（≤5MB）')
      }
    },
    [onChange],
  )

  // ──── 自定义图片工具栏按钮 ────

  const imageCommand: ICommand = {
    name: 'image',
    keyCommand: 'image',
    buttonProps: { 'aria-label': '插入图片', title: '插入图片' },
    icon: <PictureOutlined />,
    execute: () => {
      fileInputRef.current?.click()
    },
  }

  // ──── 自定义文件导入按钮（Word/PDF → Markdown）────

  /** 将解析结果文本插入到编辑器光标位置 */
  const insertText = useCallback(
    (text: string) => {
      const textarea = document.querySelector(
        '.w-md-editor-text-input',
      ) as HTMLTextAreaElement | null
      if (textarea) {
        const currentValue = valueRef.current || ''
        const start = textarea.selectionStart
        const newValue =
          currentValue.substring(0, start) +
          text +
          currentValue.substring(start)
        onChange?.(newValue)

        // 将光标移到插入内容之后
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + text.length
          textarea.focus()
        }, 0)
      } else {
        onChange?.((valueRef.current || '') + text)
      }
    },
    [onChange],
  )

  /** 解析 Word/PDF 文件并插入编辑器 */
  const doImportDoc = useCallback(
    async (file: File) => {
      const name = file.name.toLowerCase()
      const isPdf = name.endsWith('.pdf')
      if (!isPdf && !name.endsWith('.docx')) {
        message.error('仅支持 .docx / .pdf 文件')
        return
      }
      const hide = message.loading(isPdf ? 'PDF 解析中，大文件可能需要较长时间...' : 'Word 解析中...', 0)
      try {
        const result = isPdf
          ? await parsePdfFile(file)
          : await parseWordFile(file)

        const markdown = result.markdown || ''
        if (!markdown.trim()) {
          hide()
          message.warning('解析完成，但未提取到文本内容，请检查源文件。')
          return
        }

        // 在光标处插入解析结果（追加换行保证与已有内容分离）
        insertText(markdown.trimEnd() + '\n\n')

        const imageText = result.images > 0 ? `，提取图片 ${result.images} 张` : ''
        if (isPdf) {
          hide()
          message.success(`PDF 解析完成${imageText}。PDF 还原度有限，建议人工校对格式。`, 5)
        } else {
          hide()
          message.success(`Word 解析完成${imageText}。`, 3)
        }
      } catch {
        hide()
        message.error('文件解析失败，请确认文件未损坏且格式正确（≤20MB）')
      }
    },
    [insertText],
  )

  /** 文件导入命令（工具栏按钮触发隐藏 input） */
  const docImportCommand: ICommand = {
    name: 'docImport',
    keyCommand: 'docImport',
    buttonProps: { 'aria-label': '导入 Word/PDF 文件', title: '导入 Word/PDF 文件' },
    icon: <FileTextOutlined />,
    execute: () => {
      docInputRef.current?.click()
    },
  }

  // ──── 事件处理 ────

  /** 文件选择 → 上传 */
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file && isImageFile(file)) doUpload(file)
      e.target.value = '' // 允许重复选择同一文件
    },
    [doUpload],
  )

  /** 文档选择 → 解析导入 */
  const handleDocSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) doImportDoc(file)
      e.target.value = '' // 允许重复选择同一文件
    },
    [doImportDoc],
  )

  /** 粘贴图片 → 上传 */
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (isImageClipboardItem(item)) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) doUpload(file)
          return
        }
      }
    },
    [doUpload],
  )

  /** 拖拽图片 → 上传 */
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      const file = e.dataTransfer?.files?.[0]
      if (file && isImageFile(file)) {
        e.preventDefault()
        doUpload(file)
      }
    },
    [doUpload],
  )

  /** 阻止浏览器默认打开图片行为 */
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer?.types.includes('Files')) {
      e.preventDefault()
    }
  }, [])

  // ──── 渲染 ────

  return (
    <>
      {/* 隐藏的 file input，由工具栏按钮触发 */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      {/* 隐藏的文档 input，由"导入文件"按钮触发 */}
      <input
        ref={docInputRef}
        type="file"
        accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        style={{ display: 'none' }}
        onChange={handleDocSelect}
      />
      <MDEditor
        value={value}
        onChange={(val) => onChange?.(val || '')}
        height={height}
        preview="live"
        visibleDragbar={true}
        highlightEnable={true}
        data-color-mode="light"
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        commands={[
          commands.bold,
          commands.italic,
          commands.strikethrough,
          commands.divider,
          commands.title1,
          commands.title2,
          commands.title3,
          commands.divider,
          commands.quote,
          commands.code,
          commands.codeBlock,
          commands.divider,
          commands.unorderedListCommand,
          commands.orderedListCommand,
          commands.checkedListCommand,
          commands.divider,
          imageCommand,
          docImportCommand,
          commands.link,
          commands.divider,
          commands.table,
          commands.divider,
          commands.codePreview,
          commands.fullscreen,
        ]}
        extraCommands={[]}
      />
    </>
  )
}