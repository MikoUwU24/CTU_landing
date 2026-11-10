import type { CollectionConfig } from 'payload'
import { isLoggedIn } from '../access'

export const Issues: CollectionConfig = {
  slug: 'issues',
  labels: { singular: 'Số báo', plural: 'Số báo' },
  admin: { useAsTitle: 'number', defaultColumns: ['number', 'period', 'isCurrent'] },
  access: { read: () => true, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        if (!doc.isCurrent) return doc
        await req.payload.update({
          collection: 'issues',
          where: { and: [{ id: { not_equals: doc.id } }, { isCurrent: { equals: true } }] },
          data: { isCurrent: false },
          req,
        })
        return doc
      },
    ],
  },
  fields: [
    { name: 'number', type: 'text', label: 'Số', required: true, unique: true },
    { name: 'period', type: 'text', label: 'Kỳ (vd: 1-2/2027)', required: true },
    { name: 'coverImage', type: 'upload', relationTo: 'media', label: 'Ảnh bìa' },
    { name: 'isCurrent', type: 'checkbox', label: 'Số hiện tại', defaultValue: false },
  ],
}
