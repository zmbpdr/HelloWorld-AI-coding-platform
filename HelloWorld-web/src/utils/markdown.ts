import MarkdownIt from 'markdown-it'
import type MarkdownItType from 'markdown-it'
import hljs from 'highlight.js'
import taskLists from 'markdown-it-task-lists'

const md: MarkdownItType = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return (
          '<pre class="hljs"><code>' +
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
          '</code></pre>'
        )
      } catch {
        // 高亮失败时回退为转义后的纯文本代码块
      }
    }
    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>'
  },
}).use(taskLists)

/** 将 Markdown 文本转换为 HTML */
export function renderMarkdown(text: string): string {
  return md.render(text)
}
