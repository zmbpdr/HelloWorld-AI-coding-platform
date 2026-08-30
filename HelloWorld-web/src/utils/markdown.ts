import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  highlight: (str: string, lang: string) => {
    const safeLang = lang && lang.trim() ? lang : 'text'
    const escaped = str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `<pre class="language-${safeLang}"><code class="language-${safeLang}">${escaped}</code></pre>`
  },
})

// 在现有基础上保留 GFM 能力，并让代码块保持可读性。
md.renderer.rules.fence = (tokens: any[], idx: number) => {
  const token = tokens[idx]
  const info = token.info ? token.info.trim() : ''
  const langName = info ? info.split(/\s+/g)[0] : ''
  const content = token.content
  const escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<pre class="language-${langName}"><code class="language-${langName}">${escaped}</code></pre>`
}

/** 将 Markdown 文本转换为 HTML */
export function renderMarkdown(text: string): string {
  return md.render(text)
}
