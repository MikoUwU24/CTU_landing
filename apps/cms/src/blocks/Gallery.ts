import type { Block } from 'payload'

export const Gallery: Block = {
  slug: 'gallery',
  labels: { singular: 'Cụm ảnh', plural: 'Cụm ảnh' },
  fields: [
    { name: 'images', type: 'upload', relationTo: 'media', hasMany: true, minRows: 2, maxRows: 6, required: true },
  ],
}
