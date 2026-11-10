import type { GlobalConfig } from 'payload'
import { isLoggedIn } from '../access'
import { rebuildAfterGlobalChange } from '../hooks/triggerRebuild'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Giao diện',
  access: { read: () => true, update: isLoggedIn },
  hooks: { afterChange: [rebuildAfterGlobalChange] },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'logoWidthDesktop', type: 'number', label: 'Chiều rộng logo trên máy tính (px)',
          defaultValue: 248, min: 80, max: 600, required: true,
          admin: { description: 'Mặc định 248px (khoảng 1/5 khung trang).' },
        },
        {
          name: 'logoWidthMobile', type: 'number', label: 'Chiều rộng logo trên điện thoại (px)',
          defaultValue: 160, min: 60, max: 360, required: true,
          admin: { description: 'Mặc định 160px.' },
        },
      ],
    },
  ],
}
