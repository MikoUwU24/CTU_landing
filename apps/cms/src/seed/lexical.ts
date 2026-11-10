type Node = Record<string, unknown>

const HEADING_PREFIX = '## '

const text = (t: string): Node => ({ type: 'text', text: t, format: 0, style: '', mode: 'normal', detail: 0, version: 1 })
const paragraph = (t: string): Node => ({
  type: 'paragraph', children: [text(t)], direction: 'ltr', format: '', indent: 0, textFormat: 0, textStyle: '', version: 1,
})
const heading = (t: string): Node => ({
  type: 'heading', tag: 'h3', children: [text(t)], direction: 'ltr', format: '', indent: 0, version: 1,
})
const block = (fields: Record<string, unknown>): Node => ({ type: 'block', fields, format: '', version: 2 })

export function paragraphsToLexical(
  paragraphs: string[],
  extras: { pullQuote?: string | null; imageIds?: (string | number)[] } = {},
) {
  const children: Node[] = []
  const imgs = [...(extras.imageIds ?? [])]
  const bodyCount = paragraphs.filter((p) => !p.startsWith(HEADING_PREFIX)).length
  const every = imgs.length ? Math.max(2, Math.floor(bodyCount / (imgs.length + 1))) : Infinity
  let b = 0 // body paragraphs emitted so far
  paragraphs.forEach((p, i) => {
    if (p.startsWith(HEADING_PREFIX)) {
      children.push(heading(p.slice(HEADING_PREFIX.length)))
      return
    }
    children.push(paragraph(p))
    if (b === 1 && extras.pullQuote) children.push(block({ id: `pq${i}`, blockName: '', blockType: 'pullQuote', text: extras.pullQuote }))
    if ((b + 1) % every === 0 && imgs.length) {
      children.push(block({ id: `img${i}`, blockName: '', blockType: 'image', media: imgs.shift(), width: 'column' }))
    }
    b++
  })
  return { root: { type: 'root', children, direction: 'ltr', format: '', indent: 0, version: 1 } }
}
