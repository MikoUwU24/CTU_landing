import type { CollectionConfig } from 'payload'
import { isLoggedIn } from '../access'
import { rebuildAfterChange, rebuildAfterDelete } from '../hooks/triggerRebuild'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Ảnh', plural: 'Thư viện ảnh' },
  access: { read: () => true, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  hooks: { afterChange: [rebuildAfterChange], afterDelete: [rebuildAfterDelete] },
  upload: { mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'] },
  fields: [
    { name: 'alt', type: 'text', label: 'Mô tả ảnh (alt)', required: true },
    { name: 'caption', type: 'text', label: 'Chú thích' },
    { name: 'credit', type: 'text', label: 'Nguồn / tác giả' },
  ],
}
