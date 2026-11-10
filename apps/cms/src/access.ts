import type { Access } from 'payload'

export const isLoggedIn: Access = ({ req }) => Boolean(req.user)

export const isAdmin: Access = ({ req }) => req.user?.role === 'admin'

export const publishedOrLoggedIn: Access = ({ req }) =>
  req.user ? true : { _status: { equals: 'published' } }
