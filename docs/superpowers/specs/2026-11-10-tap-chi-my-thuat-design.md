# Tạp chí Mỹ thuật — Online Magazine + CMS: Design Spec

Date: 2026-11-10
Status: Approved (brainstorming), pending spec review

## Goal

Turn the print magazine `BAO.pdf` (18 A4 pages, Adobe Illustrator, issue 034, 1-2/2027) into an online news-style magazine site, using the masthead from `bao2.psd` as the logo. Editors who do not use GitHub must be able to change content through a separate CMS; every publish triggers a webhook that updates the public site.

## Source material

- `bao2.psd` (2480×3508): cover. Masthead = "TẠP CHÍ / Mỹ thuật" (maroon + orange), "FINE ARTS MAGAZINE", "HỘI MỸ THUẬT VIỆT NAM · ISSN 1859-1590", circular issue badge ("SỐ 034", "1-2/2027"), decorative traditional clouds, cream background. Layers: `Layer 3`, `Layer 2`, `Layer 4` (masthead parts), cloud layers `0CB1F6BC-…`, `Ellipse 1` + type layers (badge).
- `BAO.pdf` (596 MB, 18 pages):
  - p1: Editorial board + publisher info + "Lời ngỏ"
  - p2: Table of contents (Mục lục) with title, sapo, page number per article
  - p3–4: Hội họa Việt Nam đương đại
  - p5–6: Sắc màu kí ức
  - p7–8: Dư âm di sản thế giới
  - p9–10: Di sản trong ngôn ngữ tạo hình hôm nay
  - p11–12: Nét Việt trong tranh trẻ
  - p13–14: Phía sau một tác phẩm (body is Lorem ipsum)
  - p15–16: Hơi thở truyền thống trong hội họa đương đại (body is Lorem ipsum)
  - p17–18: Chất liệu kể chuyện văn hóa Việt (body is Lorem ipsum)
- The large source files are NOT committed to git.

## Decisions

| Topic | Decision |
|---|---|
| Product form | News-style site: home page + one detail page per article |
| Site framework | Astro, static output |
| Lorem ipsum articles | Keep as-is; replaceable via CMS |
| CMS | Payload 3 (on Next.js), separate app, email/password login |
| Update mechanism | Payload hook → Vercel Deploy Hook → static rebuild |
| Hosting | Vercel (two projects) |
| Database | Neon Postgres via Vercel Marketplace |
| Media storage | Vercel Blob |
| Fonts | Sans-serif only: Oswald (headings), Be Vietnam Pro (body), self-hosted |

## 1. Architecture

pnpm monorepo:

```
apps/web    Astro static site (public magazine)
apps/cms    Payload 3 + Next.js (admin at /admin, REST API at /api)
scripts/    PDF/PSD extraction (Python)
```

Infrastructure: Neon Postgres (`@payloadcms/db-postgres`), Vercel Blob (`@payloadcms/storage-vercel-blob`), both provisioned through the Vercel Marketplace / Vercel storage so env vars are injected automatically.

Update flow:

1. Editor publishes / unpublishes / deletes a document in Payload.
2. A shared `afterChange` / `afterDelete` hook on Articles, Issues and the globals calls `triggerRebuild()`.
3. `triggerRebuild()` only fires for published-state changes, is debounced (30 s window, so a burst of saves produces one request), and `POST`s to `WEB_DEPLOY_HOOK_URL`.
4. Vercel rebuilds `apps/web`; at build time Astro fetches content from `CMS_URL/api/...` (published documents only, depth enough to resolve media).
5. If a build fails, Vercel keeps serving the previous deployment.

Rationale for static rebuild over SSR: fast, cheap, and the public site keeps working if the CMS is down. Latency of ~1 minute after publish is acceptable.

## 2. Content model (Payload)

**Users**: email, password, role (`admin` | `editor`). Admin manages users; editor manages content.

**Media**: upload collection stored in Vercel Blob; fields `alt` (required), `caption`, `credit`.

**Issues**: `number` (e.g. "034"), `period` (e.g. "1-2/2027"), `coverImage` (Media), `isCurrent` (boolean; exactly one current issue, enforced by a `beforeChange` hook that unsets the others).

**Articles**:
- `title` (text)
- `titleAccent` (text, optional): substring of the title rendered in orange (e.g. "VIỆT NAM"); validated to be contained in `title`
- `kicker` (text, optional): small line above the title (e.g. "Hơi thở" in "HƠI THỞ TRUYỀN THỐNG TRONG…")
- `slug` (unique, auto-generated from title with Vietnamese diacritics stripped, editable)
- `sapo` (textarea), `heroImage` (Media)
- `issue` (relation → Issues), `page` (number; ordering on home and TOC)
- `featured` (boolean)
- `author` (text, optional)
- `body` (Lexical rich text) with blocks: `ImageBlock` (media, caption, width: column | full), `PullQuote` (text, attribution), `Gallery` (2–6 media)
- Drafts enabled (`versions.drafts`); only `_status = published` is shown on the site

**Globals**:
- `Foreword` (Lời ngỏ): title, body (rich text), signature
- `Masthead` (Ban biên tập & thông tin xuất bản): list of `{ role, names[] }`, publisher, address, phone, website, email, cover-art credit line

## 3. Public site (Astro)

Routes:

- `/`: masthead header (PSD logo, issue badge from current Issue, clouds, cream background); featured article (large hero image + two-tone title + sapo); article grid ordered by `page`; Lời ngỏ block; footer with editorial board and publisher info.
- `/bai/[slug]`: article detail reproducing the PDF layout: large two-tone condensed title (maroon + orange accent, optional kicker), italic sapo, drop cap on the first paragraph, body in CSS multi-columns (3 columns ≥1200 px, 2 columns ≥768 px, 1 column on mobile), full-bleed and in-column images, pull quotes, offset beige color blocks behind images as in the PDF, running footer "Mỹ Thuật {page}", prev/next article links.
- `/muc-luc`: table of contents styled like PDF page 2 (title in display font, sapo with underlined keywords, page number).
- `404`.

Mobile: single column, masthead scales down, no horizontal scroll.

## 4. Design system

- Colors (sampled from the PDF/PSD; exact values re-measured during implementation):
  cream `#F1E6D3` (page bg), maroon `#6B1E1E` (titles, logo), orange `#E07B3A` (accents), beige `#C9B29B` (color blocks), ink `#2B2420` (body text).
- Typography: Oswald 600/700 for headings (uppercase, tight tracking), Be Vietnam Pro 400/400i/600 for body and sapo. Both self-hosted (woff2, Vietnamese subset included).
- Assets: masthead and clouds exported from PSD layers to transparent PNG/WebP (2× resolution); the issue badge is rendered in HTML/CSS (not baked into the image) so it updates with the current Issue.
- Tokens live as CSS custom properties in `apps/web/src/styles/tokens.css`.

## 5. Seeding

1. `scripts/extract_pdf.py` (PyMuPDF): per page, extract text blocks with font info and embedded images; outputs `seed/content.json` (articles, foreword, masthead, TOC) and `seed/images/*`. Article boundaries and titles are mapped by a small hand-written page map (pages listed above), since layout text order is not reliable. Lorem pages keep their Lorem body.
2. `scripts/extract_psd.py` (psd-tools): export masthead + clouds into `apps/web/public/brand/`.
3. `apps/cms/src/seed.ts`: idempotent (upsert by slug); creates Issue 034, uploads images to Blob, creates Articles, Foreword, Masthead and the first admin user from env (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`).

Extraction output is reviewed by eye against the PDF before seeding; text cleanup (hyphenation, line breaks) happens in the script.

## 6. Error handling

- Webhook failure: logged server-side with status/response and persisted to a read-only `rebuild-status` global (last result, error, time) visible in the admin; the next publish retries. No silent swallowing.
- Missing env vars (`DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `PAYLOAD_SECRET`, `WEB_DEPLOY_HOOK_URL`, `CMS_URL`): fail fast at startup/build with a clear message; DB client is lazily initialized so builds don't crash on import.
- Astro build when CMS is unreachable: build fails loudly (no fallback to stale data); Vercel keeps previous deployment.
- Missing media on an article: render without the image, never a broken image.

## 7. Testing

- Unit (Vitest): `triggerRebuild` (fires only on publish-state changes, debounce collapses bursts, surfaces HTTP errors); slug generation with Vietnamese diacritics; `titleAccent` split/render helper.
- Seed: dry-run mode validates `content.json` shape and counts (8 articles, foreword, masthead).
- E2E smoke (Playwright) against the built site with fixture data: home renders masthead + all articles; an article page renders title, columns, images; `/muc-luc` lists articles in page order; mobile viewport has no horizontal overflow; Vietnamese diacritics render in both fonts.

## Out of scope (YAGNI)

- Archive of past issues / per-issue routes (model supports it; UI does not yet)
- Search, comments, newsletter, analytics
- Instant (SSR/ISR) updates
- Writing real content for the three Lorem articles

## Prerequisites from the user (at implementation time)

- Install Vercel CLI (`npm i -g vercel`) and `vercel login`
- Approve Marketplace provisioning (Neon) and Blob store creation
