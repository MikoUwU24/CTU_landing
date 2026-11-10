import type { GlobalConfig } from 'payload'
import { lexicalEditor, lexicalHTMLField } from '@payloadcms/richtext-lexical'
import { isLoggedIn } from '../access'
import { htmlConverters } from '../lib/htmlConverters'

export const Foreword: GlobalConfig = {
  slug: 'foreword',
  label: 'Lời ngỏ',
  access: { read: () => true, update: isLoggedIn },
  fields: [
    { name: 'title', type: 'text', label: 'Tiêu đề', defaultValue: 'Lời ngỏ', required: true },
    { name: 'body', type: 'richText', label: 'Nội dung', editor: lexicalEditor() },
    lexicalHTMLField({ htmlFieldName: 'bodyHtml', lexicalFieldName: 'body', converters: htmlConverters }),
    { name: 'signature', type: 'text', label: 'Lời kết', defaultValue: 'Trân trọng!' },
  ],
}
