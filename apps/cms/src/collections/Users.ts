import type { CollectionConfig } from 'payload'
import { isAdmin, isLoggedIn } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Người dùng', plural: 'Người dùng' },
  admin: { useAsTitle: 'email' },
  auth: true,
  access: {
    read: isLoggedIn,
    create: isAdmin,
    update: ({ req, id }) => req.user?.role === 'admin' || req.user?.id === id,
    delete: isAdmin,
  },
  fields: [
    { name: 'name', type: 'text', label: 'Họ tên' },
    {
      name: 'role',
      type: 'select',
      label: 'Vai trò',
      required: true,
      defaultValue: 'editor',
      options: [
        { label: 'Quản trị', value: 'admin' },
        { label: 'Biên tập viên', value: 'editor' },
      ],
      access: { update: ({ req }) => req.user?.role === 'admin' },
    },
  ],
}
