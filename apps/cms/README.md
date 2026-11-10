# Tạp chí Mỹ thuật — CMS

Payload 3 CMS (Next.js 16, Postgres, Vercel Blob) for the magazine. Editors manage the current issue,
articles, foreword, masthead and media at `/admin`. The static site in `apps/web` reads this CMS's REST API at build time.

## Environment variables

Copy `.env.example` to `.env.local`.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (Neon in production) |
| `PAYLOAD_SECRET` | Secret used to sign auth tokens |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for media; without it, media is stored locally |
| `WEB_DEPLOY_HOOK_URL` | Vercel deploy hook of the web project, called (debounced 30 s) after publish/unpublish/delete |
| `PAYLOAD_PUBLIC_SERVER_URL` | Optional public URL of the CMS |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Admin account created by the seed script |

## Commands

Run from the repo root with `pnpm --filter cms <script>`, or from `apps/cms`.

- `dev` — start the dev server (http://localhost:3000/admin)
- `migrate:create` — generate a migration after changing collections/globals
- `migrate` — apply pending migrations
- `seed` / `seed:dry` — import `seed/content.json` and images (`seed:dry` validates without writing)
- `test` — unit tests (vitest)

Schema push is disabled. Schema changes must go through migrations: after `migrate:create`, run
`migrate` against the target database before deploying the code that needs the new schema
(migrations are not applied automatically on deploy). The production DB contains a leftover
dev-push marker row (`payload_migrations` name `dev`, batch -1); `migrate` will ask to confirm —
answer yes only if the schema matches the latest migration, or delete that row first.
Never point local `dev`, `migrate` or `seed` at the production database by accident.

## Deploy (Vercel)

- Project root directory: `apps/cms`; set all variables above in the project settings.
- `/` redirects to `/admin`.
- Create a deploy hook on the web project (Settings > Git > Deploy Hooks) and put its URL in `WEB_DEPLOY_HOOK_URL`.
- The Payload API route has `maxDuration = 60` so the debounced hook call can complete.
