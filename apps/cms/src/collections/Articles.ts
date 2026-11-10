import type { CollectionConfig } from 'payload'
import { BlocksFeature, lexicalEditor, lexicalHTMLField } from '@payloadcms/richtext-lexical'
import { isLoggedIn, publishedOrLoggedIn } from '../access'
import { Gallery } from '../blocks/Gallery'
import { ImageBlock } from '../blocks/ImageBlock'
import { PullQuote } from '../blocks/PullQuote'
import { htmlConverters } from '../lib/htmlConverters'
import { vietnameseSlug } from '../lib/slug'
import { rebuildAfterChange, rebuildAfterDelete } from '../hooks/triggerRebuild'

export const Articles: CollectionConfig = {
  slug: 'articles',
  labels: { singular: 'Bài viết', plural: 'Bài viết' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'page', 'featured', '_status'] },
  versions: { drafts: true },
  hooks: { afterChange: [rebuildAfterChange], afterDelete: [rebuildAfterDelete] },
  defaultSort: 'page',
  access: { read: publishedOrLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  fields: [
    { name: 'kicker', type: 'text', label: 'Dòng nhỏ trên tít (tuỳ chọn)' },
    { name: 'title', type: 'text', label: 'Tít', required: true },
    {
      name: 'titleAccent',
      type: 'text',
      label: 'Phần tít tô màu cam',
      admin: { description: 'Một cụm chữ nằm trong tít, vd: "Việt Nam"' },
      validate: (value: string | null | undefined, { siblingData }: { siblingData: { title?: string } }) => {
        if (!value) return true
        return (siblingData.title ?? '').toLowerCase().includes(value.toLowerCase())
          ? true
          : 'Phần tô màu phải nằm trong tít'
      },
    },
    {
      name: 'slug',
      type: 'text',
      label: 'Đường dẫn',
      unique: true,
      index: true,
      admin: { position: 'sidebar' },
      hooks: {
        beforeValidate: [({ value, siblingData }) => vietnameseSlug(value || siblingData.title || '')],
      },
    },
    { name: 'sapo', type: 'textarea', label: 'Sapo' },
    { name: 'heroImage', type: 'upload', relationTo: 'media', label: 'Ảnh đại diện' },
    { name: 'issue', type: 'relationship', relationTo: 'issues', label: 'Số báo', admin: { position: 'sidebar' } },
    { name: 'page', type: 'number', label: 'Trang (thứ tự)', required: true, admin: { position: 'sidebar' } },
    { name: 'featured', type: 'checkbox', label: 'Bài nổi bật', defaultValue: false, admin: { position: 'sidebar' } },
    { name: 'author', type: 'text', label: 'Tác giả' },
    {
      name: 'body',
      type: 'richText',
      label: 'Nội dung',
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [...defaultFeatures, BlocksFeature({ blocks: [ImageBlock, PullQuote, Gallery] })],
      }),
    },
    lexicalHTMLField({ htmlFieldName: 'bodyHtml', lexicalFieldName: 'body', converters: htmlConverters }),
  ],
}
