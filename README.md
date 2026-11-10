# Tạp chí Mỹ thuật

Monorepo for the Tạp chí Mỹ thuật (Fine Arts Magazine) site.

- `apps/web` — Astro static site. Reads the CMS REST API at build time. Pages: home, article (`/bai/<slug>`), table of contents (`/muc-luc`), 404.
- `apps/cms` — Payload CMS on Next.js (Postgres, Vercel Blob). See `apps/cms/README.md`.
- `scripts/` — Python extraction of content and images from the source PDF/PSD (`BAO.pdf`, `bao2.psd`; large, git-ignored).
- `seed/` — extracted `content.json` and images imported into the CMS by `pnpm --filter cms seed`.

## Web environment variables

| Variable | Purpose |
| --- | --- |
| `CMS_URL` | Base URL of the CMS (required at build time unless using fixtures) |
| `SITE_URL` | Public URL of the site |
| `CMS_FIXTURES` | Set to `1` to build from `apps/web/tests/fixtures` instead of the CMS (tests, offline work) |

## Common commands

```
pnpm install
pnpm --filter web dev          # needs CMS_URL or CMS_FIXTURES=1
pnpm --filter web test
pnpm --filter web e2e
pnpm --filter cms dev
pnpm --filter cms test
```

Both apps deploy to Vercel as separate projects (root directories `apps/web` and `apps/cms`).
Publishing in the CMS calls the web project's deploy hook to rebuild the site.
