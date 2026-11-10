import type { Block } from 'payload'

export const PullQuote: Block = {
  slug: 'pullQuote',
  labels: { singular: 'Trích dẫn nổi', plural: 'Trích dẫn nổi' },
  fields: [
    { name: 'text', type: 'textarea', required: true, label: 'Nội dung' },
    { name: 'attribution', type: 'text', label: 'Người nói / nguồn' },
  ],
}
