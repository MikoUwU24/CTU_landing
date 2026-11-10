import type { GlobalConfig } from 'payload'
import { isLoggedIn } from '../access'

export const RebuildStatus: GlobalConfig = {
  slug: 'rebuild-status',
  label: 'Trạng thái cập nhật site',
  access: { read: isLoggedIn, update: () => false },
  admin: { description: 'Kết quả lần gần nhất CMS gọi webhook cập nhật trang báo.' },
  fields: [
    { name: 'lastStatus', type: 'text', label: 'Kết quả', admin: { readOnly: true } },
    { name: 'lastError', type: 'textarea', label: 'Lỗi', admin: { readOnly: true } },
    { name: 'lastAt', type: 'date', label: 'Thời điểm', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
  ],
}
