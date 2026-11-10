import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import sharp from 'sharp'
import { Articles } from './collections/Articles'
import { Issues } from './collections/Issues'
import { Media } from './collections/Media'
import { Users } from './collections/Users'
import { migrations } from './migrations'
import { Foreword } from './globals/Foreword'
import { Masthead } from './globals/Masthead'
import { RebuildStatus } from './globals/RebuildStatus'

const dirname = path.dirname(fileURLToPath(import.meta.url))

function env(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var: ${name}`)
  return v
}

export default buildConfig({
  admin: { user: Users.slug, importMap: { baseDir: path.resolve(dirname) } },
  collections: [Articles, Issues, Media, Users],
  globals: [Foreword, Masthead, RebuildStatus],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || '' },
    push: false,
    prodMigrations: migrations,
  }),
  sharp,
  ...(process.env.PAYLOAD_PUBLIC_SERVER_URL ? { serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL } : {}),
  plugins: [
    vercelBlobStorage({
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      collections: { media: { disablePayloadAccessControl: true } },
      token: process.env.BLOB_READ_WRITE_TOKEN,
      clientUploads: true,
    }),
  ],
  onInit: async () => {
    env('PAYLOAD_SECRET')
    env('DATABASE_URL')
  },
})
