import type { DefaultNodeTypes, SerializedBlockNode } from '@payloadcms/richtext-lexical'
import type { HTMLConverterAsync, HTMLConvertersFunctionAsync } from '@payloadcms/richtext-lexical/html-async'

// HTMLPopulateFn is not exported from the html-async entry point; derive it from the converter args.
type HTMLPopulateFn = NonNullable<Parameters<Exclude<HTMLConverterAsync, string>>[0]['populate']>

type MediaRef = unknown
type ImageFields = { blockType: 'image'; media?: MediaRef; caption?: string | null; width?: 'column' | 'full' | null }
type PullQuoteFields = { blockType: 'pullQuote'; text: string; attribution?: string | null }
type GalleryFields = { blockType: 'gallery'; images?: MediaRef[] | null }
type ArticleNodeTypes =
  | DefaultNodeTypes
  | SerializedBlockNode<ImageFields>
  | SerializedBlockNode<PullQuoteFields>
  | SerializedBlockNode<GalleryFields>

type MediaDoc = { url?: string; alt?: string; width?: number; height?: number }

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

async function resolveMedia(value: unknown, populate?: HTMLPopulateFn): Promise<MediaDoc | null> {
  if (value && typeof value === 'object') return value as MediaDoc
  if ((typeof value === 'string' || typeof value === 'number') && populate) {
    return ((await populate({ collectionSlug: 'media', id: value })) as MediaDoc) ?? null
  }
  return null
}

function img(m: MediaDoc): string {
  const size = m.width && m.height ? ` width="${m.width}" height="${m.height}"` : ''
  return `<img src="${esc(m.url ?? '')}" alt="${esc(m.alt ?? '')}"${size} loading="lazy" decoding="async">`
}

export const htmlConverters: HTMLConvertersFunctionAsync<ArticleNodeTypes> = ({ defaultConverters }) => ({
  ...defaultConverters,
  blocks: {
    image: async ({ node, populate }) => {
      const m = await resolveMedia(node.fields.media, populate)
      if (!m?.url) return ''
      const cap = node.fields.caption ? `<figcaption>${esc(node.fields.caption)}</figcaption>` : ''
      return `<figure class="fig fig--${node.fields.width ?? 'column'}">${img(m)}${cap}</figure>`
    },
    pullQuote: ({ node }) => {
      const by = node.fields.attribution ? `<cite>${esc(node.fields.attribution)}</cite>` : ''
      return `<blockquote class="pullquote"><p>${esc(node.fields.text)}</p>${by}</blockquote>`
    },
    gallery: async ({ node, populate }) => {
      const items = await Promise.all((node.fields.images ?? []).map((v: unknown) => resolveMedia(v, populate)))
      const imgs = items.filter((m): m is MediaDoc => Boolean(m?.url)).map(img).join('')
      return imgs ? `<div class="gallery">${imgs}</div>` : ''
    },
  },
})
