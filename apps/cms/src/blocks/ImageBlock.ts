import type { Block } from 'payload'

export const ImageBlock: Block = {
  slug: 'image',
  labels: { singular: 'Ảnh', plural: 'Ảnh' },
  fields: [
    { name: 'media', type: 'upload', relationTo: 'media', required: true },
    { name: 'caption', type: 'text', label: 'Chú thích' },
    {
      name: 'width', type: 'select', defaultValue: 'column', label: 'Độ rộng',
      options: [{ label: 'Trong cột', value: 'column' }, { label: 'Tràn lề', value: 'full' }],
    },
  ],
}
