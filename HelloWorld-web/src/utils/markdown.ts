import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
})

/** 将 Markdown 文本转换为 HTML */
export function renderMarkdown(text: string): string {
  return md.render(text)
}
