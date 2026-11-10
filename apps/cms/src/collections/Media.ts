import type { CollectionConfig } from 'payload'
import { isLoggedIn } from '../access'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Ảnh', plural: 'Thư viện ảnh' },
  access: { read: () => true, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  upload: { mimeTypes: ['image/*'] },
  fields: [
    { name: 'alt', type: 'text', label: 'Mô tả ảnh (alt)', required: true },
    { name: 'caption', type: 'text', label: 'Chú thích' },
    { name: 'credit', type: 'text', label: 'Nguồn / tác giả' },
  ],
}
