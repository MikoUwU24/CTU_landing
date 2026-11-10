import { defineConfig } from 'astro/config'

export default defineConfig({
  site: process.env.SITE_URL || 'http://localhost:4321',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'directory' },
  image: { remotePatterns: [{ protocol: 'https', hostname: '**.public.blob.vercel-storage.com' }] },
})
