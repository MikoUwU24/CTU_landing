import type { GlobalConfig } from 'payload'
import { isLoggedIn } from '../access'

export const Masthead: GlobalConfig = {
  slug: 'masthead',
  label: 'Ban biên tập & xuất bản',
  access: { read: () => true, update: isLoggedIn },
  fields: [
    {
      name: 'board', type: 'array', label: 'Ban biên tập',
      fields: [
        { name: 'role', type: 'text', label: 'Chức danh', required: true },
        { name: 'names', type: 'array', label: 'Họ tên', fields: [{ name: 'name', type: 'text', required: true }] },
      ],
    },
    { name: 'publisher', type: 'text', label: 'Nhà xuất bản' },
    { name: 'address', type: 'text', label: 'Địa chỉ' },
    { name: 'phone', type: 'text', label: 'Điện thoại' },
    { name: 'website', type: 'text', label: 'Website' },
    { name: 'email', type: 'text', label: 'Email' },
    { name: 'coverCredit', type: 'text', label: 'Ghi chú ảnh bìa' },
  ],
}
