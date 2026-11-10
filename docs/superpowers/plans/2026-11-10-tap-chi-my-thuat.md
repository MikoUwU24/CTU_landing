# Tạp chí Mỹ thuật — Online Magazine + CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a news-style web version of the print magazine `BAO.pdf` (masthead from `bao2.psd`) with a separate Payload CMS that triggers a static rebuild of the site via webhook on every publish.

**Architecture:** pnpm monorepo. `apps/cms` = Payload 3 on Next.js 16 (Neon Postgres + Vercel Blob), admin at `/admin`, REST at `/api`. `apps/web` = Astro 7 static site that fetches published content from the CMS REST API at build time. Payload `afterChange`/`afterDelete` hooks POST to a Vercel Deploy Hook of the web project. Python scripts extract brand assets (PSD) and seed content (PDF).

**Tech Stack:** Node 24 LTS, pnpm 10, Astro 7.4.x, Payload 3.93.0 (`payload`, `@payloadcms/next`, `@payloadcms/db-postgres`, `@payloadcms/storage-vercel-blob`, `@payloadcms/richtext-lexical`), Next.js 16.4.x, Vitest 5, Playwright 1.65, Python 3.14 + PyMuPDF + psd-tools + Pillow + pytest, `@fontsource/oswald`, `@fontsource/be-vietnam-pro`.

**Spec:** `docs/superpowers/specs/2026-11-10-tap-chi-my-thuat-design.md`

## Global Constraints

- Node `>=22.23.4` is required by Astro 7; use **Node 24 LTS** everywhere (`.nvmrc` = `24`, `engines.node` = `>=24`). Current machine has Node 22.18 → must upgrade first (Task 0).
- Package manager: **pnpm** only. Pin Payload packages to exactly `3.93.0` (all `@payloadcms/*` must share the same version as `payload`).
- `BAO.pdf` and `bao2.psd` are never committed (already in `.gitignore`). Generated `seed/images/` is git-ignored; `seed/content.json` is committed.
- Python: run with `py -3.14 -I` (Windows launcher). Scripts live in `scripts/`, take paths as arguments.
- Fonts: sans-serif only — Oswald 600/700 (headings), Be Vietnam Pro 400/400 italic/600 (body). Self-hosted via Fontsource (no Google Fonts CDN).
- Colors (CSS custom properties): `--cream #F1E6D3`, `--maroon #6B1E1E`, `--orange #E07B3A`, `--beige #C9B29B`, `--ink #2B2420`. Re-measure in Task 2 and update only these tokens.
- Routes: `/`, `/bai/[slug]`, `/muc-luc`, `404`.
- Only documents with `_status = 'published'` appear on the site.
- Env vars: CMS — `DATABASE_URL`, `PAYLOAD_SECRET`, `BLOB_READ_WRITE_TOKEN`, `WEB_DEPLOY_HOOK_URL`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`. Web — `CMS_URL`, `CMS_FIXTURES` (`1` = read local fixtures, used by tests).
- Missing required env var → throw `Error("Missing env var: NAME")` at use time (never at import time).
- Article text is copied verbatim from the PDF (including its typos); pages 13–18 keep Lorem ipsum bodies.
- UI copy is Vietnamese.

---

## File Structure

```
.nvmrc                                  Node version (24)
package.json                            root scripts, pnpm workspace tooling
pnpm-workspace.yaml                     apps/*
.gitignore                              (exists) + seed/images/
requirements.txt                        Python deps for scripts/
scripts/
  extract_psd.py                        PSD layers -> apps/web/public/brand/*.png
  extract_pdf.py                        BAO.pdf -> seed/content.json + seed/images/*
  pdf_text.py                           pure text helpers (dehyphenate, join blocks, drop cap)
  page_map.py                           hand-written article/page/title/accent/sapo map
  tests/test_pdf_text.py                pytest for pdf_text
  tests/test_content_json.py            pytest validating seed/content.json shape
seed/
  content.json                          extracted content (committed)
  images/                               extracted images (ignored)
apps/cms/                               Payload 3 + Next.js (scaffolded by create-payload-app)
  src/payload.config.ts                 config: db, blob, collections, globals
  src/access.ts                         access helpers (isAdmin, publishedOrLoggedIn)
  src/lib/slug.ts                       vietnameseSlug()
  src/lib/rebuild.ts                    createRebuildTrigger() (debounced deploy-hook call)
  src/lib/htmlConverters.ts             Lexical -> HTML converters for custom blocks
  src/hooks/triggerRebuild.ts           Payload hooks wiring rebuild + RebuildStatus
  src/collections/Users.ts
  src/collections/Media.ts
  src/collections/Issues.ts
  src/collections/Articles.ts
  src/blocks/ImageBlock.ts
  src/blocks/PullQuote.ts
  src/blocks/Gallery.ts
  src/globals/Foreword.ts
  src/globals/Masthead.ts
  src/globals/RebuildStatus.ts
  src/seed/index.ts                     idempotent seed from seed/content.json
  src/seed/validate.ts                  validateContent() (pure)
  tests/*.test.ts                       vitest
apps/web/                               Astro 7 static site
  astro.config.mjs
  src/lib/types.ts                      Article, Issue, Foreword, Masthead, Media types
  src/lib/cms.ts                        getArticles/getArticle/getCurrentIssue/getForeword/getMasthead
  src/lib/title.ts                      splitTitle(title, accent)
  src/styles/tokens.css                 design tokens
  src/styles/global.css                 base + typography
  src/styles/article.css                multi-column article layout
  src/components/Masthead.astro         logo + issue badge + clouds
  src/components/Footer.astro           editorial board + publisher
  src/components/TwoToneTitle.astro     maroon/orange title
  src/components/ArticleCard.astro      grid card
  src/components/FeaturedArticle.astro
  src/components/Foreword.astro
  src/layouts/Base.astro
  src/pages/index.astro
  src/pages/bai/[slug].astro
  src/pages/muc-luc.astro
  src/pages/404.astro
  public/brand/                         masthead.png, clouds-*.png (from Task 2)
  tests/fixtures/*.json                 CMS fixture responses
  tests/unit/*.test.ts                  vitest
  tests/e2e/site.spec.ts                playwright
  playwright.config.ts
```

---

### Task 0: Prerequisites (user-assisted)

**Files:** none

- [ ] **Step 1: Upgrade Node to 24 LTS**

Ask the user to install Node 24 LTS (https://nodejs.org or `winget install OpenJS.NodeJS.LTS`), then verify:

Run: `node -v`
Expected: `v24.x.x`

- [ ] **Step 2: Install Vercel CLI and log in**

Run: `npm i -g vercel@latest` then ask the user to run `! vercel login` (interactive).
Verify: `vercel whoami` prints the account name.

- [ ] **Step 3: Install Python deps**

Create `requirements.txt`:

```
pymupdf==1.26.*
psd-tools==1.10.*
pillow==11.*
pytest==8.*
```

Run: `py -3.14 -m pip install -r requirements.txt`
Expected: installs without error; `py -3.14 -c "import fitz, psd_tools, PIL, pytest"` exits 0.

---

### Task 1: Monorepo skeleton

**Files:**
- Create: `.nvmrc`, `package.json`, `pnpm-workspace.yaml`
- Modify: `.gitignore`

**Interfaces:**
- Produces: root scripts `pnpm dev:cms`, `pnpm dev:web`, `pnpm test` used by later tasks.

- [ ] **Step 1: Write files**

`.nvmrc`:
```
24
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - apps/*
```

`package.json`:
```json
{
  "name": "tap-chi-my-thuat",
  "private": true,
  "engines": { "node": ">=24" },
  "packageManager": "pnpm@10.33.3",
  "scripts": {
    "dev:cms": "pnpm --filter cms dev",
    "dev:web": "pnpm --filter web dev",
    "build:web": "pnpm --filter web build",
    "test": "pnpm -r --if-present test",
    "test:py": "py -3.14 -I -m pytest scripts/tests -q"
  }
}
```

Append to `.gitignore`:
```
seed/images/
__pycache__/
.pytest_cache/
test-results/
playwright-report/
```

- [ ] **Step 2: Verify**

Run: `pnpm install`
Expected: completes (no workspace packages yet, no error).

- [ ] **Step 3: Commit**

```bash
git add .nvmrc package.json pnpm-workspace.yaml .gitignore requirements.txt
git commit -m "chore: set up pnpm monorepo skeleton"
```

---

### Task 2: Brand assets from PSD

**Files:**
- Create: `scripts/extract_psd.py`
- Output: `apps/web/public/brand/masthead.png`, `apps/web/public/brand/cloud-top.png`, `apps/web/public/brand/cloud-right.png`, `apps/web/public/brand/cover.jpg`, `apps/web/public/brand/colors.json`

**Interfaces:**
- Produces: the files above, referenced by `Masthead.astro` (Task 10) as `/brand/masthead.png`, `/brand/cloud-top.png`, `/brand/cloud-right.png`.

PSD layer inventory (index, name, bbox in 2480×3508 px):
`0 Background` · `1 0CB1F6BC… (cloud, top-left)` (0,-232,1916,1966) · `3 Layer 1` (painting) · `4 Layer 3` (0,-12,1180,553) · `5 Layer 2` (184,456,1412,1144) · `6 type "số"` · `7,8 0CB1F6BC… (clouds)` · `9 type "034"` · `10 type "1-2/2027"` · `11 Ellipse 1` (badge ring) · `12 Layer 4` (-475,271,1542,1241). The masthead ("TẠP CHÍ / Mỹ thuật / FINE ARTS MAGAZINE / HỘI MỸ THUẬT…") is composed of layers 4, 5, 12. The badge (6, 9, 10, 11) is NOT exported — it is rendered in HTML.

- [ ] **Step 1: Write the script**

`scripts/extract_psd.py`:
```python
"""Export masthead, clouds, cover and sampled colors from bao2.psd.

Usage: py -3.14 -I scripts/extract_psd.py <psd_path> <out_dir>
"""
import json
import sys
from pathlib import Path

from PIL import Image
from psd_tools import PSDImage

MASTHEAD_LAYERS = {4, 5, 12}
CLOUD_TOP = 1
CLOUD_RIGHT = 8
PAINTING = 3


def compose(psd, indices):
    canvas = Image.new("RGBA", psd.size, (0, 0, 0, 0))
    for i, layer in enumerate(psd):
        if i in indices:
            img = layer.composite()
            if img is None:
                continue
            canvas.alpha_composite(img.convert("RGBA"), dest=(max(layer.left, 0), max(layer.top, 0)),
                                   source=(max(-layer.left, 0), max(-layer.top, 0)))
    bbox = canvas.getbbox()
    return canvas.crop(bbox) if bbox else canvas


def sample(img, xy):
    r, g, b = img.convert("RGB").getpixel(xy)[:3]
    return f"#{r:02X}{g:02X}{b:02X}"


def main(psd_path, out_dir):
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    psd = PSDImage.open(psd_path)

    masthead = compose(psd, MASTHEAD_LAYERS)
    masthead.save(out / "masthead.png", optimize=True)
    compose(psd, {CLOUD_TOP}).save(out / "cloud-top.png", optimize=True)
    compose(psd, {CLOUD_RIGHT}).save(out / "cloud-right.png", optimize=True)

    full = psd.composite().convert("RGB")
    full.thumbnail((1600, 1600))
    full.save(out / "cover.jpg", quality=85)

    big = psd.composite()
    colors = {
        "cream": sample(big, (2400, 40)),
        "maroon": sample(masthead, (masthead.width // 12, masthead.height // 2)),
    }
    (out / "colors.json").write_text(json.dumps(colors, indent=2), encoding="utf-8")
    print("wrote", sorted(p.name for p in out.iterdir()), colors)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
```

- [ ] **Step 2: Run it**

Run: `py -3.14 -I scripts/extract_psd.py bao2.psd apps/web/public/brand`
Expected: prints 5 file names and a colors dict.

- [ ] **Step 3: Visually verify**

Open `apps/web/public/brand/masthead.png` with the Read tool. It must show "TẠP CHÍ Mỹ thuật / FINE ARTS MAGAZINE / HỘI MỸ THUẬT VIỆT NAM · ISSN 1859-1590" on a transparent background, with no clouds or badge. If a layer is missing or extra (e.g. a cloud fragment), adjust `MASTHEAD_LAYERS` and rerun. Same check for both cloud PNGs.

- [ ] **Step 4: Record colors**

Compare `colors.json` with the Global Constraints palette. If `cream`/`maroon` differ, use the sampled values in Task 9's `tokens.css` (and note it in the commit message).

- [ ] **Step 5: Commit**

```bash
git add scripts/extract_psd.py apps/web/public/brand
git commit -m "feat: extract masthead and cloud assets from PSD"
```

---

### Task 3: PDF text helpers (TDD)

**Files:**
- Create: `scripts/pdf_text.py`, `scripts/tests/test_pdf_text.py`, `scripts/tests/__init__.py` (empty), `scripts/__init__.py` (empty), `conftest.py` at repo root (empty, makes `scripts` importable for pytest)

**Interfaces:**
- Produces (used by Task 4):
  - `clean_block(text: str) -> str` — joins wrapped lines into one paragraph, collapses whitespace, removes soft hyphenation (`"tạo-\nhình"` → `"tạohình"` only when the hyphen is at line end and next char is lowercase).
  - `apply_drop_cap(paragraph: str, letter: str) -> str` — prefixes the drop-cap letter, stripping leading whitespace.
  - `is_lorem(text: str) -> bool`

- [ ] **Step 1: Write the failing tests**

`scripts/tests/test_pdf_text.py`:
```python
from scripts.pdf_text import apply_drop_cap, clean_block, is_lorem


def test_clean_block_joins_lines_and_collapses_spaces():
    assert clean_block("Hội họa  Việt\nNam đương\n  đại") == "Hội họa Việt Nam đương đại"


def test_clean_block_removes_line_end_hyphenation():
    assert clean_block("sáng-\ntạo mới") == "sángtạo mới"


def test_clean_block_keeps_real_hyphen():
    assert clean_block("NDO - Dẫu hòa vào") == "NDO - Dẫu hòa vào"


def test_apply_drop_cap():
    assert apply_drop_cap("    riển lãm \"Hiện thực +\"", "T") == "Triển lãm \"Hiện thực +\""


def test_is_lorem():
    assert is_lorem("Lorem ipsum dolor sit amet, consectetuer")
    assert not is_lorem("Triển lãm Hiện thực")
```

- [ ] **Step 2: Run to verify failure**

Run: `py -3.14 -I -m pytest scripts/tests/test_pdf_text.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'scripts.pdf_text'`

- [ ] **Step 3: Implement**

`scripts/pdf_text.py`:
```python
import re


def clean_block(text: str) -> str:
    text = re.sub(r"-\n(?=[a-zà-ỹđ])", "", text)
    text = text.replace("\n", " ")
    return re.sub(r"\s+", " ", text).strip()


def apply_drop_cap(paragraph: str, letter: str) -> str:
    return letter + paragraph.lstrip()


def is_lorem(text: str) -> bool:
    return text.lstrip().lower().startswith("lorem ipsum")
```

- [ ] **Step 4: Run to verify pass**

Run: `py -3.14 -I -m pytest scripts/tests/test_pdf_text.py -q`
Expected: `5 passed`

- [ ] **Step 5: Commit**

```bash
git add conftest.py scripts/__init__.py scripts/pdf_text.py scripts/tests
git commit -m "feat: add PDF text cleanup helpers"
```

---

### Task 4: Extract PDF content to seed/content.json

**Files:**
- Create: `scripts/page_map.py`, `scripts/extract_pdf.py`, `scripts/tests/test_content_json.py`
- Output: `seed/content.json` (committed), `seed/images/*.jpg` (ignored)

**Interfaces:**
- Consumes: `clean_block`, `apply_drop_cap`, `is_lorem` (Task 3)
- Produces: `seed/content.json` with this exact shape (consumed by Task 8 `validateContent` and seed):

```ts
{
  issue: { number: string; period: string; coverImage: string }       // coverImage = file name in seed/images
  foreword: { title: string; paragraphs: string[]; signature: string }
  masthead: {
    board: { role: string; names: string[] }[]
    publisher: string; address: string; phone: string; website: string; email: string
    coverCredit: string
  }
  articles: {
    slug: string; title: string; titleAccent: string; page: number; featured: boolean
    sapo: string; tocBlurb: string; heroImage: string | null; images: string[]
    paragraphs: string[]; pullQuote: string | null; isLorem: boolean
  }[]
}
```

PDF facts (from inspection; fonts are subset-prefixed, match on suffix):
- Display titles: font contains `DLCalvera`, `UTM-Alberta`, `Saltstar`, `Lodestone`, size ≥ 20.
- Body: `PalatinoLinotype-Roman` size 10.5–11.5 (excluding the running footer "Mỹ Thuật" at y > 785).
- Drop cap: `PalatinoLinotype-Italic` size ≥ 30, single letter.
- Pull quote / lead: `PalatinoLinotype-Bold` size 12–14 on article pages.
- Blocks with bbox x0 < 15 on page 2 are bleed fragments → ignore.
- Pages 13–18 bodies are Lorem ipsum.

- [ ] **Step 1: Write the hand-written page map**

`scripts/page_map.py` (titles/accents/blurbs taken from PDF page 2 and the page titles; masthead from page 1):
```python
ARTICLES = [
    {"slug": "hoi-hoa-viet-nam-duong-dai", "title": "Hội họa Việt Nam đương đại", "titleAccent": "Việt Nam",
     "pages": [3, 4], "featured": True,
     "tocBlurb": "Khám phá ngôn ngữ tạo hình và dấu ấn sáng tạo của nghệ sĩ hôm nay."},
    {"slug": "sac-mau-ki-uc", "title": "Sắc màu kí ức", "titleAccent": "Sắc màu",
     "pages": [5, 6], "featured": False,
     "tocBlurb": "Những gam màu cũ, những miền kí ức vẫn còn hiện hữu trong tranh."},
    {"slug": "du-am-di-san-the-gioi", "title": "Dư âm di sản thế giới", "titleAccent": "di sản thế giới",
     "pages": [7, 8], "featured": False,
     "tocBlurb": "Di sản không chỉ nằm trong bảo tàng, mà còn sống động qua từng nét vẽ."},
    {"slug": "di-san-trong-ngon-ngu-tao-hinh-hom-nay", "title": "Di sản trong ngôn ngữ tạo hình hôm nay",
     "titleAccent": "Di sản trong ngôn ngữ", "pages": [9, 10], "featured": False,
     "tocBlurb": "Khi giá trị mỹ thuật truyền thống gặp gỡ tư duy sáng tạo hiện đại."},
    {"slug": "net-viet-trong-tranh-tre", "title": "Nét Việt trong tranh trẻ", "titleAccent": "trong",
     "pages": [11, 12], "featured": False,
     "tocBlurb": "Văn hóa Việt trong góc nhìn trẻ."},
    {"slug": "phia-sau-mot-tac-pham", "title": "Phía sau một tác phẩm", "titleAccent": "tác phẩm",
     "pages": [13, 14], "featured": False,
     "tocBlurb": "Từ những nét phác thảo đầu tiên đến hành trình hoàn thiện tác phẩm."},
    {"slug": "hoi-tho-truyen-thong-trong-hoi-hoa-duong-dai",
     "title": "Hơi thở truyền thống trong hội họa đương đại", "titleAccent": "truyền thống",
     "pages": [15, 16], "featured": False,
     "tocBlurb": "Những giá trị văn hóa xưa được tái hiện qua góc nhìn sáng tạo của các nghệ sĩ hôm nay."},
    {"slug": "chat-lieu-ke-chuyen-van-hoa-viet", "title": "Chất liệu kể chuyện văn hóa Việt",
     "titleAccent": "Chất liệu", "pages": [17, 18], "featured": False,
     "tocBlurb": "Từ sơn mài đến lụa, mỗi chất liệu đều góp phần kể lại những câu chuyện đậm bản sắc Việt."},
]

ISSUE = {"number": "034", "period": "1-2/2027", "coverImage": "cover.jpg"}

MASTHEAD = {
    "board": [
        {"role": "Tổng biên tập", "names": ["Nguyễn Thị Cẩm Tú"]},
        {"role": "Phó tổng biên tập", "names": ["Hà Thị Huệ"]},
        {"role": "Thư ký tòa soạn", "names": ["Nguyễn Thị Tuyết"]},
        {"role": "Trưởng ban biên tập", "names": ["Trần Việt Anh Cường"]},
        {"role": "Phó ban biên tập", "names": ["Nguyễn Thị Thùy Linh"]},
        {"role": "Biên tập", "names": ["Nguyễn Huy Nhật", "Nguyễn Huy Chủ", "Tạ Thị Ngánh"]},
        {"role": "Ban dịch thuật", "names": ["Nguyễn Thu Đông", "Tạ Thế Tâm"]},
    ],
    "publisher": "Nhà xuất bản Tuổi Trẻ",
    "address": "161B Lý Chính Thắng, Phường Võ Thị Sáu, Quận 1, TP Hồ Chí Minh",
    "phone": "0982093005",
    "website": "tapchimithuat.vn",
    "email": "tapchimythuat.gmail.com",
    "coverCredit": "Bìa sử dụng tranh của họa sĩ Vũ Đình Tuấn",
}
```

Note: `website` and `email` are copied verbatim from the PDF (the email lacks `@`; flag this to the user at the end, do not silently fix).

- [ ] **Step 2: Write the failing shape test**

`scripts/tests/test_content_json.py`:
```python
import json
from pathlib import Path

CONTENT = Path(__file__).resolve().parents[2] / "seed" / "content.json"


def load():
    return json.loads(CONTENT.read_text(encoding="utf-8"))


def test_has_eight_articles_in_page_order():
    arts = load()["articles"]
    assert [a["page"] for a in arts] == [3, 5, 7, 9, 11, 13, 15, 17]


def test_real_articles_have_body_and_lorem_flagged():
    for a in load()["articles"]:
        assert len(a["paragraphs"]) >= 3, a["slug"]
        assert a["isLorem"] == (a["page"] >= 13), a["slug"]


def test_first_article_starts_with_drop_cap_word():
    first = load()["articles"][0]["paragraphs"][0]
    assert first.startswith("Triển lãm"), first[:40]


def test_accent_is_substring_of_title():
    for a in load()["articles"]:
        assert a["titleAccent"].lower() in a["title"].lower(), a["slug"]


def test_foreword_and_masthead():
    c = load()
    assert c["foreword"]["title"] == "Lời ngỏ"
    assert c["foreword"]["paragraphs"]
    assert c["masthead"]["board"][0]["role"] == "Tổng biên tập"


def test_images_exist():
    c = load()
    img_dir = CONTENT.parent / "images"
    for a in c["articles"]:
        for name in a["images"]:
            assert (img_dir / name).exists(), name
```

- [ ] **Step 3: Run to verify failure**

Run: `py -3.14 -I -m pytest scripts/tests/test_content_json.py -q`
Expected: FAIL — `FileNotFoundError` for `seed/content.json`

- [ ] **Step 4: Implement the extractor**

`scripts/extract_pdf.py`:
```python
"""Extract BAO.pdf into seed/content.json + seed/images.

Usage: py -3.14 -I scripts/extract_pdf.py <pdf_path> <seed_dir>
"""
import json
import shutil
import sys
from pathlib import Path

import fitz

from scripts.page_map import ARTICLES, ISSUE, MASTHEAD
from scripts.pdf_text import apply_drop_cap, clean_block, is_lorem

DISPLAY = ("DLCalvera", "UTM-Alberta", "Saltstar", "Lodestone", "Demian", "American-Sans")
MIN_IMAGE_PX = 400


def spans(block):
    return [s for line in block["lines"] for s in line["spans"] if s["text"].strip()]


def block_text(block):
    return "\n".join("".join(s["text"] for s in line["spans"]) for line in block["lines"])


def classify(block, page_h):
    sp = spans(block)
    if not sp:
        return None
    font, size = sp[0]["font"], sp[0]["size"]
    x0, y0 = block["bbox"][0], block["bbox"][1]
    if y0 > page_h - 57 or x0 < 15:
        return None  # running footer or bleed fragment
    if any(d in font for d in DISPLAY) and size >= 20:
        return "title"
    if "Italic" in font and size >= 30 and len(block_text(block).strip()) == 1:
        return "dropcap"
    if font.endswith("PalatinoLinotype-Bold") and 12 <= size <= 14:
        return "lead"
    if font.endswith("PalatinoLinotype-Roman") and 10.5 <= size <= 11.5:
        return "body"
    return None


def reading_order(blocks):
    # columns: group by x0 bucket (50pt), then top-to-bottom
    return sorted(blocks, key=lambda b: (round(b["bbox"][0] / 50), b["bbox"][1]))


def extract_images(doc, page_numbers, img_dir, prefix):
    names, seen = [], set()
    for pn in page_numbers:
        for xref, *_rest in doc[pn - 1].get_images(full=True):
            if xref in seen:
                continue
            seen.add(xref)
            pix = fitz.Pixmap(doc, xref)
            if pix.width < MIN_IMAGE_PX or pix.height < MIN_IMAGE_PX:
                continue
            if pix.n - pix.alpha >= 4:
                pix = fitz.Pixmap(fitz.csRGB, pix)
            if pix.alpha:
                pix = fitz.Pixmap(pix, 0)
            if max(pix.width, pix.height) > 2400:
                factor = 2400 / max(pix.width, pix.height)
                pix = fitz.Pixmap(pix, int(pix.width * factor), int(pix.height * factor), None)
            name = f"{prefix}-{len(names) + 1}.jpg"
            pix.save(img_dir / name, jpg_quality=85)
            names.append((name, pix.width * pix.height))
    names_sorted = [n for n, _ in names]
    hero = max(names, key=lambda t: t[1])[0] if names else None
    return names_sorted, hero


def extract_article(doc, meta, img_dir):
    paragraphs, lead, dropcap = [], None, None
    for pn in meta["pages"]:
        page = doc[pn - 1]
        blocks = [b for b in page.get_text("dict")["blocks"] if b["type"] == 0]
        typed = [(classify(b, page.rect.height), b) for b in blocks]
        for kind, b in typed:
            if kind == "dropcap" and dropcap is None:
                dropcap = block_text(b).strip()
            if kind == "lead" and lead is None:
                lead = clean_block(block_text(b))
        for b in reading_order([b for k, b in typed if k == "body"]):
            text = clean_block(block_text(b))
            if text:
                paragraphs.append(text)
    if dropcap and paragraphs:
        paragraphs[0] = apply_drop_cap(paragraphs[0], dropcap)
    images, hero = extract_images(doc, meta["pages"], img_dir, meta["slug"])
    body_is_lorem = bool(paragraphs) and is_lorem(paragraphs[0])
    return {
        "slug": meta["slug"], "title": meta["title"], "titleAccent": meta["titleAccent"],
        "page": meta["pages"][0], "featured": meta["featured"],
        "sapo": lead or meta["tocBlurb"], "tocBlurb": meta["tocBlurb"],
        "heroImage": hero, "images": images, "paragraphs": paragraphs,
        "pullQuote": lead, "isLorem": body_is_lorem,
    }


def extract_foreword(doc):
    page = doc[0]
    paras, signature = [], "Trân trọng!"
    for b in page.get_text("dict")["blocks"]:
        if b["type"] != 0:
            continue
        sp = spans(b)
        if not sp or b["bbox"][0] < 400:
            continue
        text = clean_block(block_text(b))
        if sp[0]["font"].endswith("PalatinoLinotype-Roman") and sp[0]["size"] < 12 and text != "Mỹ Thuật":
            paras.append(text)
        elif "Italic" in sp[0]["font"]:
            signature = text
    return {"title": "Lời ngỏ", "paragraphs": paras, "signature": signature}


def extract_cover(doc, img_dir):
    xref = doc[0].get_images(full=True)[0][0]
    pix = fitz.Pixmap(doc, xref)
    if pix.n - pix.alpha >= 4:
        pix = fitz.Pixmap(fitz.csRGB, pix)
    factor = 2400 / max(pix.width, pix.height)
    pix = fitz.Pixmap(pix, int(pix.width * factor), int(pix.height * factor), None)
    pix.save(img_dir / ISSUE["coverImage"], jpg_quality=85)


def main(pdf_path, seed_dir):
    seed = Path(seed_dir)
    img_dir = seed / "images"
    shutil.rmtree(img_dir, ignore_errors=True)
    img_dir.mkdir(parents=True)
    doc = fitz.open(pdf_path)
    extract_cover(doc, img_dir)
    content = {
        "issue": ISSUE,
        "foreword": extract_foreword(doc),
        "masthead": MASTHEAD,
        "articles": [extract_article(doc, m, img_dir) for m in ARTICLES],
    }
    (seed / "content.json").write_text(json.dumps(content, ensure_ascii=False, indent=2), encoding="utf-8")
    for a in content["articles"]:
        print(a["page"], a["slug"], len(a["paragraphs"]), "paras", len(a["images"]), "imgs", "lorem" if a["isLorem"] else "")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
```

- [ ] **Step 5: Run the extractor**

Run (from repo root, so `scripts` is importable): `py -3.14 -I -c "import sys; sys.path.insert(0, '.'); from scripts.extract_pdf import main; main('BAO.pdf', 'seed')"`
Expected: 8 lines, each with ≥3 paragraphs; pages 13–17 marked `lorem`. Runtime may be several minutes (596 MB PDF).

- [ ] **Step 6: Run the shape tests**

Run: `py -3.14 -I -m pytest scripts/tests -q`
Expected: all pass. If `test_first_article_starts_with_drop_cap_word` fails, inspect paragraph order of page 3 (`reading_order` bucket size) and fix; if a page yields <3 paragraphs, print its blocks with font/size and widen the `body` size range.

- [ ] **Step 7: Manual review against the PDF**

Read 2 rendered PDF pages (e.g. render page 5 and 9 at 60 dpi with PyMuPDF to the scratchpad and Read them) and compare paragraph order in `seed/content.json` for those articles. Fix ordering issues in `reading_order` only; do not hand-edit the JSON.

- [ ] **Step 8: Commit**

```bash
git add scripts/page_map.py scripts/extract_pdf.py scripts/tests/test_content_json.py seed/content.json
git commit -m "feat: extract magazine content from PDF into seed JSON"
```

---

### Task 5: Scaffold Payload CMS app

**Files:**
- Create: `apps/cms/**` (via create-payload-app), then modify `apps/cms/package.json`, `apps/cms/src/payload.config.ts`
- Create: `apps/cms/src/access.ts`, `apps/cms/src/collections/Users.ts`, `apps/cms/vitest.config.ts`

**Interfaces:**
- Produces:
  - `isAdmin: Access`, `isLoggedIn: Access`, `publishedOrLoggedIn: Access` from `src/access.ts`
  - `Users` collection with `role: 'admin' | 'editor'`
  - `pnpm --filter cms test` runs vitest

- [ ] **Step 1: Scaffold**

Run:
```bash
npx create-payload-app@3.93.0 --name cms --template blank --db postgres --use-pnpm --no-deps --no-git --no-agent
```
Run it from `apps/` (create `apps/` first). If the CLI still prompts, answer: project name `cms`, template `blank`, database `PostgreSQL`, connection string `postgres://localhost:5432/cms` (placeholder; replaced in Task 7).

Then set `"name": "cms"` in `apps/cms/package.json`, pin all `payload`/`@payloadcms/*` deps to `3.93.0`, and add:
```bash
pnpm --filter cms add @payloadcms/storage-vercel-blob@3.93.0
pnpm --filter cms add -D vitest@5
pnpm install
```

- [ ] **Step 2: Access helpers**

`apps/cms/src/access.ts`:
```ts
import type { Access } from 'payload'

export const isLoggedIn: Access = ({ req }) => Boolean(req.user)

export const isAdmin: Access = ({ req }) => req.user?.role === 'admin'

export const publishedOrLoggedIn: Access = ({ req }) =>
  req.user ? true : { _status: { equals: 'published' } }
```

- [ ] **Step 3: Users collection**

`apps/cms/src/collections/Users.ts` (replace the scaffolded one):
```ts
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
```

- [ ] **Step 4: Vitest config**

`apps/cms/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
})
```
Add to `apps/cms/package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 5: Verify typecheck**

Run: `pnpm --filter cms exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/cms package.json pnpm-lock.yaml
git commit -m "feat(cms): scaffold Payload 3 app with users and access helpers"
```

---

### Task 6: Content model (slug util TDD + collections + globals)

**Files:**
- Create: `apps/cms/src/lib/slug.ts`, `apps/cms/tests/slug.test.ts`
- Create: `apps/cms/src/collections/Media.ts`, `Issues.ts`, `Articles.ts`
- Create: `apps/cms/src/blocks/ImageBlock.ts`, `PullQuote.ts`, `Gallery.ts`
- Create: `apps/cms/src/lib/htmlConverters.ts`
- Create: `apps/cms/src/globals/Foreword.ts`, `Masthead.ts`
- Modify: `apps/cms/src/payload.config.ts`

**Interfaces:**
- Consumes: `isAdmin`, `isLoggedIn`, `publishedOrLoggedIn` (Task 5)
- Produces:
  - `vietnameseSlug(input: string): string`
  - Collections slugs: `media`, `issues`, `articles`; globals: `foreword`, `masthead`
  - Article fields exactly: `title`, `titleAccent`, `kicker`, `slug`, `sapo`, `heroImage`, `issue`, `page`, `featured`, `author`, `body` (lexical), `bodyHtml` (generated HTML string), `_status`
  - Foreword fields: `title`, `body` (lexical), `bodyHtml`, `signature`
  - Masthead fields: `board[] {role, names[] {name}}`, `publisher`, `address`, `phone`, `website`, `email`, `coverCredit`
  - Issue fields: `number`, `period`, `coverImage`, `isCurrent`
  - Media fields: `alt`, `caption`, `credit`, plus Payload upload `url`, `width`, `height`

- [ ] **Step 1: Write the failing slug test**

`apps/cms/tests/slug.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { vietnameseSlug } from '../src/lib/slug'

describe('vietnameseSlug', () => {
  it('strips Vietnamese diacritics and đ', () => {
    expect(vietnameseSlug('Hội họa Việt Nam đương đại')).toBe('hoi-hoa-viet-nam-duong-dai')
  })
  it('collapses punctuation and spaces', () => {
    expect(vietnameseSlug('  Dư âm — di sản, thế giới! ')).toBe('du-am-di-san-the-gioi')
  })
  it('handles uppercase Đ', () => {
    expect(vietnameseSlug('ĐẬM BẢN SẮC')).toBe('dam-ban-sac')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter cms test`
Expected: FAIL — cannot find module `../src/lib/slug`

- [ ] **Step 3: Implement**

`apps/cms/src/lib/slug.ts`:
```ts
export function vietnameseSlug(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm --filter cms test`
Expected: `3 passed`

- [ ] **Step 5: Media + Issues**

`apps/cms/src/collections/Media.ts`:
```ts
import type { CollectionConfig } from 'payload'
import { isLoggedIn } from '../access'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Ảnh', plural: 'Thư viện ảnh' },
  access: { read: () => true, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  upload: { mimeTypes: ['image/*'] },
  fields: [
    { name: 'alt', type: 'text', label: 'Mô tả ảnh (alt)', required: true },
    { name: 'caption', type: 'text', label: 'Chú thích' },
    { name: 'credit', type: 'text', label: 'Nguồn / tác giả' },
  ],
}
```

`apps/cms/src/collections/Issues.ts`:
```ts
import type { CollectionConfig } from 'payload'
import { isLoggedIn } from '../access'

export const Issues: CollectionConfig = {
  slug: 'issues',
  labels: { singular: 'Số báo', plural: 'Số báo' },
  admin: { useAsTitle: 'number', defaultColumns: ['number', 'period', 'isCurrent'] },
  access: { read: () => true, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        if (!doc.isCurrent) return doc
        await req.payload.update({
          collection: 'issues',
          where: { and: [{ id: { not_equals: doc.id } }, { isCurrent: { equals: true } }] },
          data: { isCurrent: false },
          req,
        })
        return doc
      },
    ],
  },
  fields: [
    { name: 'number', type: 'text', label: 'Số', required: true, unique: true },
    { name: 'period', type: 'text', label: 'Kỳ (vd: 1-2/2027)', required: true },
    { name: 'coverImage', type: 'upload', relationTo: 'media', label: 'Ảnh bìa' },
    { name: 'isCurrent', type: 'checkbox', label: 'Số hiện tại', defaultValue: false },
  ],
}
```

- [ ] **Step 6: Blocks**

`apps/cms/src/blocks/ImageBlock.ts`:
```ts
import type { Block } from 'payload'

export const ImageBlock: Block = {
  slug: 'image',
  labels: { singular: 'Ảnh', plural: 'Ảnh' },
  fields: [
    { name: 'media', type: 'upload', relationTo: 'media', required: true },
    { name: 'caption', type: 'text', label: 'Chú thích' },
    {
      name: 'width', type: 'select', defaultValue: 'column', label: 'Độ rộng',
      options: [{ label: 'Trong cột', value: 'column' }, { label: 'Tràn lề', value: 'full' }],
    },
  ],
}
```

`apps/cms/src/blocks/PullQuote.ts`:
```ts
import type { Block } from 'payload'

export const PullQuote: Block = {
  slug: 'pullQuote',
  labels: { singular: 'Trích dẫn nổi', plural: 'Trích dẫn nổi' },
  fields: [
    { name: 'text', type: 'textarea', required: true, label: 'Nội dung' },
    { name: 'attribution', type: 'text', label: 'Người nói / nguồn' },
  ],
}
```

`apps/cms/src/blocks/Gallery.ts`:
```ts
import type { Block } from 'payload'

export const Gallery: Block = {
  slug: 'gallery',
  labels: { singular: 'Cụm ảnh', plural: 'Cụm ảnh' },
  fields: [
    { name: 'images', type: 'upload', relationTo: 'media', hasMany: true, minRows: 2, maxRows: 6, required: true },
  ],
}
```

- [ ] **Step 7: HTML converters**

`apps/cms/src/lib/htmlConverters.ts`:
```ts
import type { HTMLConvertersFunctionAsync, HTMLPopulateFn } from '@payloadcms/richtext-lexical/html-async'

type MediaDoc = { url?: string; alt?: string; width?: number; height?: number }

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

async function resolveMedia(value: unknown, populate?: HTMLPopulateFn): Promise<MediaDoc | null> {
  if (value && typeof value === 'object') return value as MediaDoc
  if ((typeof value === 'string' || typeof value === 'number') && populate) {
    return ((await populate({ collectionSlug: 'media', id: value })) as MediaDoc) ?? null
  }
  return null
}

function img(m: MediaDoc): string {
  const size = m.width && m.height ? ` width="${m.width}" height="${m.height}"` : ''
  return `<img src="${esc(m.url ?? '')}" alt="${esc(m.alt ?? '')}"${size} loading="lazy" decoding="async">`
}

export const htmlConverters: HTMLConvertersFunctionAsync = ({ defaultConverters }) => ({
  ...defaultConverters,
  blocks: {
    image: async ({ node, populate }) => {
      const m = await resolveMedia(node.fields.media, populate)
      if (!m?.url) return ''
      const cap = node.fields.caption ? `<figcaption>${esc(node.fields.caption)}</figcaption>` : ''
      return `<figure class="fig fig--${node.fields.width ?? 'column'}">${img(m)}${cap}</figure>`
    },
    pullQuote: ({ node }) => {
      const by = node.fields.attribution ? `<cite>${esc(node.fields.attribution)}</cite>` : ''
      return `<blockquote class="pullquote"><p>${esc(node.fields.text)}</p>${by}</blockquote>`
    },
    gallery: async ({ node, populate }) => {
      const items = await Promise.all((node.fields.images ?? []).map((v: unknown) => resolveMedia(v, populate)))
      const imgs = items.filter((m): m is MediaDoc => Boolean(m?.url)).map(img).join('')
      return imgs ? `<div class="gallery">${imgs}</div>` : ''
    },
  },
})
```

- [ ] **Step 8: Articles**

`apps/cms/src/collections/Articles.ts`:
```ts
import type { CollectionConfig } from 'payload'
import { BlocksFeature, lexicalEditor, lexicalHTMLField } from '@payloadcms/richtext-lexical'
import { isLoggedIn, publishedOrLoggedIn } from '../access'
import { Gallery } from '../blocks/Gallery'
import { ImageBlock } from '../blocks/ImageBlock'
import { PullQuote } from '../blocks/PullQuote'
import { htmlConverters } from '../lib/htmlConverters'
import { vietnameseSlug } from '../lib/slug'

export const Articles: CollectionConfig = {
  slug: 'articles',
  labels: { singular: 'Bài viết', plural: 'Bài viết' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'page', 'featured', '_status'] },
  versions: { drafts: true },
  defaultSort: 'page',
  access: { read: publishedOrLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  fields: [
    { name: 'kicker', type: 'text', label: 'Dòng nhỏ trên tít (tuỳ chọn)' },
    { name: 'title', type: 'text', label: 'Tít', required: true },
    {
      name: 'titleAccent',
      type: 'text',
      label: 'Phần tít tô màu cam',
      admin: { description: 'Một cụm chữ nằm trong tít, vd: "Việt Nam"' },
      validate: (value: string | null | undefined, { siblingData }: { siblingData: { title?: string } }) => {
        if (!value) return true
        return (siblingData.title ?? '').toLowerCase().includes(value.toLowerCase())
          ? true
          : 'Phần tô màu phải nằm trong tít'
      },
    },
    {
      name: 'slug',
      type: 'text',
      label: 'Đường dẫn',
      unique: true,
      index: true,
      admin: { position: 'sidebar' },
      hooks: {
        beforeValidate: [({ value, siblingData }) => vietnameseSlug(value || siblingData.title || '')],
      },
    },
    { name: 'sapo', type: 'textarea', label: 'Sapo' },
    { name: 'heroImage', type: 'upload', relationTo: 'media', label: 'Ảnh đại diện' },
    { name: 'issue', type: 'relationship', relationTo: 'issues', label: 'Số báo', admin: { position: 'sidebar' } },
    { name: 'page', type: 'number', label: 'Trang (thứ tự)', required: true, admin: { position: 'sidebar' } },
    { name: 'featured', type: 'checkbox', label: 'Bài nổi bật', defaultValue: false, admin: { position: 'sidebar' } },
    { name: 'author', type: 'text', label: 'Tác giả' },
    {
      name: 'body',
      type: 'richText',
      label: 'Nội dung',
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [...defaultFeatures, BlocksFeature({ blocks: [ImageBlock, PullQuote, Gallery] })],
      }),
    },
    lexicalHTMLField({ htmlFieldName: 'bodyHtml', lexicalFieldName: 'body', converters: htmlConverters }),
  ],
}
```

- [ ] **Step 9: Globals**

`apps/cms/src/globals/Foreword.ts`:
```ts
import type { GlobalConfig } from 'payload'
import { lexicalEditor, lexicalHTMLField } from '@payloadcms/richtext-lexical'
import { isLoggedIn } from '../access'
import { htmlConverters } from '../lib/htmlConverters'

export const Foreword: GlobalConfig = {
  slug: 'foreword',
  label: 'Lời ngỏ',
  access: { read: () => true, update: isLoggedIn },
  fields: [
    { name: 'title', type: 'text', label: 'Tiêu đề', defaultValue: 'Lời ngỏ', required: true },
    { name: 'body', type: 'richText', label: 'Nội dung', editor: lexicalEditor() },
    lexicalHTMLField({ htmlFieldName: 'bodyHtml', lexicalFieldName: 'body', converters: htmlConverters }),
    { name: 'signature', type: 'text', label: 'Lời kết', defaultValue: 'Trân trọng!' },
  ],
}
```

`apps/cms/src/globals/Masthead.ts`:
```ts
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
```

- [ ] **Step 10: Wire config**

Replace `apps/cms/src/payload.config.ts` (keep the scaffold's `importMap`/`admin.importMap.baseDir`/`typescript.outputFile` lines if present):
```ts
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
import { Foreword } from './globals/Foreword'
import { Masthead } from './globals/Masthead'

const dirname = path.dirname(fileURLToPath(import.meta.url))

function env(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var: ${name}`)
  return v
}

export default buildConfig({
  admin: { user: Users.slug, importMap: { baseDir: path.resolve(dirname) } },
  collections: [Articles, Issues, Media, Users],
  globals: [Foreword, Masthead],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({ pool: { connectionString: process.env.DATABASE_URL || '' } }),
  sharp,
  cors: '*',
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
```

Add to `apps/cms/src/app/(payload)/` nothing — the scaffold already wires admin and API routes. Check that `sharp` is in deps (scaffold includes it); if not: `pnpm --filter cms add sharp`.

- [ ] **Step 11: Generate types and typecheck**

Run:
```bash
pnpm --filter cms exec payload generate:types
pnpm --filter cms exec payload generate:importmap
pnpm --filter cms exec tsc --noEmit
```
Expected: `payload-types.ts` contains `Article` with `bodyHtml?: string | null`; tsc passes. If `validate`'s signature errors, type it as `TextFieldSingleValidation` from `payload`.

- [ ] **Step 12: Commit**

```bash
git add apps/cms
git commit -m "feat(cms): add articles, issues, media, foreword and masthead models"
```

---

### Task 7: Rebuild webhook (TDD) + status global

**Files:**
- Create: `apps/cms/src/lib/rebuild.ts`, `apps/cms/tests/rebuild.test.ts`
- Create: `apps/cms/src/hooks/triggerRebuild.ts`, `apps/cms/src/globals/RebuildStatus.ts`
- Modify: `apps/cms/src/collections/Articles.ts`, `Issues.ts`, `apps/cms/src/globals/Foreword.ts`, `Masthead.ts`, `apps/cms/src/payload.config.ts`

**Interfaces:**
- Produces:
  - `createRebuildTrigger(opts: { url: () => string | undefined; delayMs: number; fetchFn?: typeof fetch; onResult: (r: RebuildResult) => Promise<void> | void; keepAlive?: (p: Promise<unknown>) => void }): { request(): void; flush(): Promise<void> }`
  - `type RebuildResult = { ok: boolean; status?: number; error?: string; at: string }`
  - `shouldRebuild(args: { doc: { _status?: string } | null; previousDoc?: { _status?: string } | null; operation: 'create' | 'update' | 'delete' }): boolean`
  - Hooks: `rebuildAfterChange: CollectionAfterChangeHook`, `rebuildAfterDelete: CollectionAfterDeleteHook`, `rebuildAfterGlobalChange: GlobalAfterChangeHook`
  - Global `rebuild-status` with `lastStatus`, `lastError`, `lastAt` (read-only in admin)

Rules: rebuild when a doc is published, when a published doc is unpublished, on delete of a published doc, and on any change to a collection without drafts (Issues, globals). Debounce: repeated `request()` within `delayMs` collapses to one POST after the last call (trailing). On Vercel, the pending promise is kept alive with `waitUntil` from `@vercel/functions`.

- [ ] **Step 1: Write the failing tests**

`apps/cms/tests/rebuild.test.ts`:
```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRebuildTrigger, shouldRebuild } from '../src/lib/rebuild'

describe('shouldRebuild', () => {
  it('fires when publishing', () => {
    expect(shouldRebuild({ operation: 'update', doc: { _status: 'published' }, previousDoc: { _status: 'draft' } })).toBe(true)
  })
  it('fires when unpublishing', () => {
    expect(shouldRebuild({ operation: 'update', doc: { _status: 'draft' }, previousDoc: { _status: 'published' } })).toBe(true)
  })
  it('skips draft-only saves', () => {
    expect(shouldRebuild({ operation: 'update', doc: { _status: 'draft' }, previousDoc: { _status: 'draft' } })).toBe(false)
  })
  it('fires for collections without drafts', () => {
    expect(shouldRebuild({ operation: 'create', doc: {}, previousDoc: null })).toBe(true)
  })
  it('on delete: fires for published docs and for collections without drafts, skips drafts', () => {
    expect(shouldRebuild({ operation: 'delete', doc: { _status: 'published' } })).toBe(true)
    expect(shouldRebuild({ operation: 'delete', doc: {} })).toBe(true)
    expect(shouldRebuild({ operation: 'delete', doc: { _status: 'draft' } })).toBe(false)
  })
})

describe('createRebuildTrigger', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('debounces bursts into one POST', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }))
    const onResult = vi.fn()
    const t = createRebuildTrigger({ url: () => 'https://hook', delayMs: 30_000, fetchFn, onResult })
    t.request(); t.request(); t.request()
    await vi.advanceTimersByTimeAsync(29_000)
    expect(fetchFn).not.toHaveBeenCalled()
    t.request()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(fetchFn).toHaveBeenCalledWith('https://hook', { method: 'POST' })
    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ ok: true, status: 201 }))
  })

  it('reports HTTP errors', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('nope', { status: 500 }))
    const onResult = vi.fn()
    const t = createRebuildTrigger({ url: () => 'https://hook', delayMs: 10, fetchFn, onResult })
    t.request()
    await vi.advanceTimersByTimeAsync(10)
    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ ok: false, status: 500, error: 'nope' }))
  })

  it('reports network errors', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('ECONNRESET'))
    const onResult = vi.fn()
    const t = createRebuildTrigger({ url: () => 'https://hook', delayMs: 10, fetchFn, onResult })
    t.request()
    await vi.advanceTimersByTimeAsync(10)
    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ ok: false, error: 'ECONNRESET' }))
  })

  it('reports missing URL instead of throwing', async () => {
    const onResult = vi.fn()
    const t = createRebuildTrigger({ url: () => undefined, delayMs: 10, fetchFn: vi.fn(), onResult })
    t.request()
    await vi.advanceTimersByTimeAsync(10)
    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ ok: false, error: 'Missing env var: WEB_DEPLOY_HOOK_URL' }))
  })

  it('passes the pending promise to keepAlive', () => {
    const keepAlive = vi.fn()
    const t = createRebuildTrigger({ url: () => 'https://hook', delayMs: 10, fetchFn: vi.fn(), onResult: vi.fn(), keepAlive })
    t.request()
    expect(keepAlive).toHaveBeenCalledWith(expect.any(Promise))
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter cms test`
Expected: FAIL — cannot find module `../src/lib/rebuild`

- [ ] **Step 3: Implement**

`apps/cms/src/lib/rebuild.ts`:
```ts
export type RebuildResult = { ok: boolean; status?: number; error?: string; at: string }

type Status = { _status?: string } | null | undefined

export function shouldRebuild(args: { doc: Status; previousDoc?: Status; operation: 'create' | 'update' | 'delete' }): boolean {
  const now = args.doc?._status
  const before = args.previousDoc?._status
  if (args.operation === 'delete') return now === 'published' || now === undefined
  if (now === undefined && before === undefined) return true // collection/global without drafts
  return now === 'published' || before === 'published'
}

export function createRebuildTrigger(opts: {
  url: () => string | undefined
  delayMs: number
  fetchFn?: typeof fetch
  onResult: (r: RebuildResult) => Promise<void> | void
  keepAlive?: (p: Promise<unknown>) => void
}) {
  const fetchFn = opts.fetchFn ?? fetch
  let timer: ReturnType<typeof setTimeout> | undefined
  let resolvePending: (() => void) | undefined
  let pending: Promise<void> | undefined

  async function fire() {
    const at = new Date().toISOString()
    const url = opts.url()
    let result: RebuildResult
    if (!url) {
      result = { ok: false, error: 'Missing env var: WEB_DEPLOY_HOOK_URL', at }
    } else {
      try {
        const res = await fetchFn(url, { method: 'POST' })
        result = res.ok ? { ok: true, status: res.status, at } : { ok: false, status: res.status, error: await res.text(), at }
      } catch (e) {
        result = { ok: false, error: e instanceof Error ? e.message : String(e), at }
      }
    }
    if (!result.ok) console.error('[rebuild] deploy hook failed', result)
    await opts.onResult(result)
  }

  function request() {
    if (timer) clearTimeout(timer)
    if (!pending) {
      pending = new Promise<void>((resolve) => { resolvePending = resolve })
      opts.keepAlive?.(pending)
    }
    timer = setTimeout(async () => {
      timer = undefined
      const done = resolvePending
      pending = undefined
      resolvePending = undefined
      await fire()
      done?.()
    }, opts.delayMs)
  }

  return { request, flush: () => pending ?? Promise.resolve() }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm --filter cms test`
Expected: all rebuild + slug tests pass.

- [ ] **Step 5: RebuildStatus global + hooks**

`apps/cms/src/globals/RebuildStatus.ts`:
```ts
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
```

Install: `pnpm --filter cms add @vercel/functions`

`apps/cms/src/hooks/triggerRebuild.ts`:
```ts
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook, Payload } from 'payload'
import { waitUntil } from '@vercel/functions'
import { createRebuildTrigger, shouldRebuild } from '../lib/rebuild'

let payloadRef: Payload | undefined

const trigger = createRebuildTrigger({
  url: () => process.env.WEB_DEPLOY_HOOK_URL,
  delayMs: 30_000,
  keepAlive: (p) => waitUntil(p),
  onResult: async (r) => {
    await payloadRef?.updateGlobal({
      slug: 'rebuild-status',
      data: { lastStatus: r.ok ? `OK (${r.status})` : `LỖI${r.status ? ` (${r.status})` : ''}`, lastError: r.error ?? '', lastAt: r.at },
      overrideAccess: true,
    })
  },
})

export const rebuildAfterChange: CollectionAfterChangeHook = ({ doc, previousDoc, operation, req }) => {
  payloadRef = req.payload
  if (shouldRebuild({ doc, previousDoc, operation })) trigger.request()
  return doc
}

export const rebuildAfterDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
  payloadRef = req.payload
  if (shouldRebuild({ doc, operation: 'delete' })) trigger.request()
  return doc
}

export const rebuildAfterGlobalChange: GlobalAfterChangeHook = ({ doc, req }) => {
  payloadRef = req.payload
  trigger.request()
  return doc
}
```

- [ ] **Step 6: Wire hooks**

- `Articles.ts`: add `hooks: { afterChange: [rebuildAfterChange], afterDelete: [rebuildAfterDelete] }`.
- `Issues.ts`: append `rebuildAfterChange` to the existing `afterChange` array and add `afterDelete: [rebuildAfterDelete]`. The bulk `update` inside the Issues hook will also call `rebuildAfterChange`; the debounce collapses it.
- `Foreword.ts`, `Masthead.ts`: add `hooks: { afterChange: [rebuildAfterGlobalChange] }`.
- `Media.ts`: no hook (media alone doesn't change the site; the article that uses it does).
- `payload.config.ts`: add `RebuildStatus` to `globals`.

- [ ] **Step 7: Typecheck + tests**

Run: `pnpm --filter cms exec payload generate:types && pnpm --filter cms exec tsc --noEmit && pnpm --filter cms test`
Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add apps/cms
git commit -m "feat(cms): trigger debounced site rebuild via deploy hook on publish"
```

---

### Task 8: Provision Neon + Blob, migrate, seed (TDD for validation)

**Files:**
- Create: `apps/cms/src/seed/validate.ts`, `apps/cms/tests/validate.test.ts`, `apps/cms/src/seed/index.ts`, `apps/cms/src/seed/lexical.ts`
- Modify: `apps/cms/package.json` (scripts `seed`, `seed:dry`)

**Interfaces:**
- Consumes: `seed/content.json` shape (Task 4); collections/globals (Tasks 6–7)
- Produces:
  - `validateContent(raw: unknown): { ok: true; content: SeedContent } | { ok: false; errors: string[] }`
  - `paragraphsToLexical(paragraphs: string[], extras?: { pullQuote?: string | null; imageIds?: (string | number)[] }): SerializedEditorState`
  - Running `pnpm --filter cms seed` populates DB + Blob idempotently.

- [ ] **Step 1: Provision (user-assisted)**

From `apps/cms`:
```bash
vercel link --yes --project tap-chi-my-thuat-cms
vercel integration add neon --yes --no-claim
vercel blob create-store tap-chi-my-thuat-media --access public
vercel env add PAYLOAD_SECRET production preview development   # paste output of: node -e "console.log(crypto.randomBytes(32).toString('hex'))"
vercel env add SEED_ADMIN_EMAIL development
vercel env add SEED_ADMIN_PASSWORD development
vercel env pull .env --yes
```
If the Neon add or Blob store creation needs a dashboard step, stop and ask the user to finish it, then continue. Connect the Blob store to the project if the CLI did not (`vercel blob` output says so). Verify `.env` contains names `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `PAYLOAD_SECRET` (print names only: `grep -o '^[A-Z_]*' apps/cms/.env`). Never print values.

If Neon provides `DATABASE_URL_UNPOOLED` / `POSTGRES_URL`, keep `DATABASE_URL` = pooled URL.

- [ ] **Step 2: Create migration and migrate**

```bash
pnpm --filter cms exec payload migrate:create initial
pnpm --filter cms exec payload migrate
```
Expected: migration file under `apps/cms/src/migrations/`; migrate reports success.

- [ ] **Step 3: Write the failing validation test**

`apps/cms/tests/validate.test.ts`:
```ts
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'
import { validateContent } from '../src/seed/validate'

const real = JSON.parse(readFileSync(resolve(__dirname, '../../../seed/content.json'), 'utf8'))

describe('validateContent', () => {
  it('accepts the extracted content', () => {
    const r = validateContent(real)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.content.articles).toHaveLength(8)
  })
  it('rejects missing articles', () => {
    const r = validateContent({ ...real, articles: [] })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors).toContain('articles: expected 8, got 0')
  })
  it('rejects accent not in title', () => {
    const bad = structuredClone(real)
    bad.articles[0].titleAccent = 'xyz'
    const r = validateContent(bad)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0]).toMatch(/titleAccent/)
  })
})
```

- [ ] **Step 4: Run to verify failure**

Run: `pnpm --filter cms test`
Expected: FAIL — cannot find module `../src/seed/validate`

- [ ] **Step 5: Implement validation**

`apps/cms/src/seed/validate.ts`:
```ts
export type SeedArticle = {
  slug: string; title: string; titleAccent: string; page: number; featured: boolean
  sapo: string; tocBlurb: string; heroImage: string | null; images: string[]
  paragraphs: string[]; pullQuote: string | null; isLorem: boolean
}
export type SeedContent = {
  issue: { number: string; period: string; coverImage: string }
  foreword: { title: string; paragraphs: string[]; signature: string }
  masthead: {
    board: { role: string; names: string[] }[]
    publisher: string; address: string; phone: string; website: string; email: string; coverCredit: string
  }
  articles: SeedArticle[]
}

export function validateContent(raw: unknown): { ok: true; content: SeedContent } | { ok: false; errors: string[] } {
  const errors: string[] = []
  const c = raw as Partial<SeedContent>
  if (!c?.issue?.number) errors.push('issue.number: required')
  if (!c?.foreword?.paragraphs?.length) errors.push('foreword.paragraphs: required')
  if (!c?.masthead?.board?.length) errors.push('masthead.board: required')
  const arts = c?.articles ?? []
  if (arts.length !== 8) errors.push(`articles: expected 8, got ${arts.length}`)
  for (const a of arts) {
    if (!a.slug || !a.title) errors.push(`article ${a.page}: slug/title required`)
    if (a.titleAccent && !a.title.toLowerCase().includes(a.titleAccent.toLowerCase()))
      errors.push(`article ${a.slug}: titleAccent "${a.titleAccent}" not in title`)
    if (!a.paragraphs?.length) errors.push(`article ${a.slug}: paragraphs required`)
  }
  return errors.length ? { ok: false, errors } : { ok: true, content: c as SeedContent }
}
```

- [ ] **Step 6: Run to verify pass**

Run: `pnpm --filter cms test`
Expected: all pass.

- [ ] **Step 7: Lexical builder**

`apps/cms/src/seed/lexical.ts`:
```ts
type Node = Record<string, unknown>

const text = (t: string): Node => ({ type: 'text', text: t, format: 0, style: '', mode: 'normal', detail: 0, version: 1 })
const paragraph = (t: string): Node => ({
  type: 'paragraph', children: [text(t)], direction: 'ltr', format: '', indent: 0, textFormat: 0, textStyle: '', version: 1,
})
const block = (fields: Record<string, unknown>): Node => ({ type: 'block', fields, format: '', version: 2 })

export function paragraphsToLexical(
  paragraphs: string[],
  extras: { pullQuote?: string | null; imageIds?: (string | number)[] } = {},
) {
  const children: Node[] = []
  const imgs = [...(extras.imageIds ?? [])]
  const every = imgs.length ? Math.max(2, Math.floor(paragraphs.length / (imgs.length + 1))) : Infinity
  paragraphs.forEach((p, i) => {
    children.push(paragraph(p))
    if (i === 1 && extras.pullQuote) children.push(block({ id: `pq${i}`, blockName: '', blockType: 'pullQuote', text: extras.pullQuote }))
    if ((i + 1) % every === 0 && imgs.length) {
      children.push(block({ id: `img${i}`, blockName: '', blockType: 'image', media: imgs.shift(), width: 'column' }))
    }
  })
  return { root: { type: 'root', children, direction: 'ltr', format: '', indent: 0, version: 1 } }
}
```

- [ ] **Step 8: Seed script**

`apps/cms/src/seed/index.ts`:
```ts
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload, type Payload } from 'payload'
import config from '../payload.config'
import { paragraphsToLexical } from './lexical'
import { validateContent } from './validate'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const seedDir = path.join(root, 'seed')
const dryRun = process.argv.includes('--dry-run')

async function upsertMedia(payload: Payload, file: string, alt: string) {
  const existing = await payload.find({ collection: 'media', where: { filename: { equals: file } }, limit: 1 })
  if (existing.docs[0]) return existing.docs[0].id
  const filePath = path.join(seedDir, 'images', file)
  if (!existsSync(filePath)) throw new Error(`Missing seed image: ${filePath}`)
  const doc = await payload.create({ collection: 'media', data: { alt }, filePath })
  return doc.id
}

async function main() {
  const result = validateContent(JSON.parse(readFileSync(path.join(seedDir, 'content.json'), 'utf8')))
  if (!result.ok) {
    console.error(result.errors.join('\n'))
    process.exit(1)
  }
  const c = result.content
  if (dryRun) {
    console.log(`OK: ${c.articles.length} articles, foreword ${c.foreword.paragraphs.length} paras, board ${c.masthead.board.length} roles`)
    return
  }
  const payload = await getPayload({ config })

  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) throw new Error('Missing env var: SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD')
  const users = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1 })
  if (!users.docs[0]) await payload.create({ collection: 'users', data: { email, password, role: 'admin', name: 'Quản trị' } })

  const coverId = await upsertMedia(payload, c.issue.coverImage, `Bìa Tạp chí Mỹ thuật số ${c.issue.number}`)
  const issues = await payload.find({ collection: 'issues', where: { number: { equals: c.issue.number } }, limit: 1 })
  const issueData = { number: c.issue.number, period: c.issue.period, coverImage: coverId, isCurrent: true }
  const issue = issues.docs[0]
    ? await payload.update({ collection: 'issues', id: issues.docs[0].id, data: issueData })
    : await payload.create({ collection: 'issues', data: issueData })

  for (const a of c.articles) {
    const imageIds = []
    for (const f of a.images) imageIds.push(await upsertMedia(payload, f, a.title))
    const heroId = a.heroImage ? await upsertMedia(payload, a.heroImage, a.title) : undefined
    const bodyImages = imageIds.filter((id) => id !== heroId)
    const data = {
      title: a.title, titleAccent: a.titleAccent, slug: a.slug, sapo: a.sapo, page: a.page,
      featured: a.featured, issue: issue.id, heroImage: heroId,
      body: paragraphsToLexical(a.paragraphs, { pullQuote: a.isLorem ? null : a.pullQuote, imageIds: bodyImages }),
      _status: 'published' as const,
    }
    const found = await payload.find({ collection: 'articles', where: { slug: { equals: a.slug } }, limit: 1, draft: true })
    if (found.docs[0]) await payload.update({ collection: 'articles', id: found.docs[0].id, data })
    else await payload.create({ collection: 'articles', data })
    console.log('article', a.page, a.slug)
  }

  await payload.updateGlobal({
    slug: 'foreword',
    data: { title: c.foreword.title, signature: c.foreword.signature, body: paragraphsToLexical(c.foreword.paragraphs) },
  })
  await payload.updateGlobal({
    slug: 'masthead',
    data: { ...c.masthead, board: c.masthead.board.map((b) => ({ role: b.role, names: b.names.map((name) => ({ name })) })) },
  })
  console.log('seed done')
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

Add scripts to `apps/cms/package.json`:
```json
"seed": "cross-env NODE_OPTIONS=--no-deprecation payload run src/seed/index.ts",
"seed:dry": "payload run src/seed/index.ts -- --dry-run"
```
(`pnpm --filter cms add -D cross-env` if not present.) `payload run` loads `.env`.

- [ ] **Step 9: Dry run then real seed**

Run: `pnpm --filter cms seed:dry`
Expected: `OK: 8 articles, foreword N paras, board 7 roles`

Run: `pnpm --filter cms seed`
Expected: 8 `article …` lines then `seed done`. Seeding fires the rebuild hook; with no `WEB_DEPLOY_HOOK_URL` yet, `rebuild-status` records `Missing env var: WEB_DEPLOY_HOOK_URL` — expected at this stage. Run it twice; the second run must not create duplicates (check `payload.find` counts in admin: 8 articles, 1 issue).

- [ ] **Step 10: Check admin + API locally**

Run: `pnpm dev:cms`, open `http://localhost:3000/admin`, log in with seed admin, open one article (body shows paragraphs, pull quote and images). Then:
`curl -s "http://localhost:3000/api/articles?limit=1&depth=1" | node -e "const d=JSON.parse(require('fs').readFileSync(0));console.log(d.docs[0].title, d.docs[0].bodyHtml.slice(0,120))"`
Expected: title and HTML starting with `<p`.

- [ ] **Step 11: Commit**

```bash
git add apps/cms
git commit -m "feat(cms): seed issue 034 content from extracted PDF data"
```

---

### Task 9: Astro web app, tokens, CMS client (TDD)

**Files:**
- Create: `apps/web/package.json`, `apps/web/astro.config.mjs`, `apps/web/tsconfig.json`, `apps/web/vitest.config.ts`
- Create: `apps/web/src/lib/types.ts`, `apps/web/src/lib/cms.ts`, `apps/web/src/lib/title.ts`
- Create: `apps/web/src/styles/tokens.css`, `apps/web/src/styles/global.css`
- Create: `apps/web/tests/fixtures/articles.json`, `issues.json`, `foreword.json`, `masthead.json`
- Create: `apps/web/tests/unit/title.test.ts`, `apps/web/tests/unit/cms.test.ts`

**Interfaces:**
- Produces:
  - `splitTitle(title: string, accent?: string | null): { text: string; accent: boolean }[]`
  - `getArticles(): Promise<Article[]>` (published, sorted by `page`)
  - `getArticle(slug: string): Promise<Article | undefined>`
  - `getCurrentIssue(): Promise<Issue | undefined>`
  - `getForeword(): Promise<Foreword>`
  - `getMasthead(): Promise<Masthead>`
  - Types in `types.ts`: `Media { url: string; alt: string; width?: number; height?: number; caption?: string | null }`, `Article { id; slug; title; titleAccent?: string|null; kicker?: string|null; sapo?: string|null; heroImage?: Media|null; page: number; featured?: boolean|null; author?: string|null; bodyHtml?: string|null }`, `Issue { number; period; coverImage?: Media|null }`, `Foreword { title; bodyHtml?: string|null; signature?: string|null }`, `Masthead { board: { role: string; names: { name: string }[] }[]; publisher?; address?; phone?; website?; email?; coverCredit? }`

- [ ] **Step 1: Scaffold**

```bash
mkdir -p apps/web && cd apps/web
pnpm init
pnpm add astro@7 @fontsource/oswald@5 @fontsource/be-vietnam-pro@5
pnpm add -D vitest@5 @playwright/test@1.65 typescript
```
Set `"name": "web"`, `"type": "module"` and scripts in `apps/web/package.json`:
```json
"scripts": {
  "dev": "astro dev",
  "build": "astro build",
  "preview": "astro preview",
  "test": "vitest run",
  "e2e": "playwright test"
}
```

`apps/web/astro.config.mjs`:
```js
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: process.env.SITE_URL || 'http://localhost:4321',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'directory' },
  image: { remotePatterns: [{ protocol: 'https', hostname: '**.public.blob.vercel-storage.com' }] },
})
```

`apps/web/tsconfig.json`:
```json
{ "extends": "astro/tsconfigs/strict", "include": [".astro/types.d.ts", "src", "tests"] }
```

`apps/web/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
export default defineConfig({ test: { include: ['tests/unit/**/*.test.ts'] } })
```

- [ ] **Step 2: Write failing title test**

`apps/web/tests/unit/title.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { splitTitle } from '../../src/lib/title'

describe('splitTitle', () => {
  it('marks the accent part, case-insensitive, preserving original casing', () => {
    expect(splitTitle('Hội họa Việt Nam đương đại', 'việt nam')).toEqual([
      { text: 'Hội họa ', accent: false },
      { text: 'Việt Nam', accent: true },
      { text: ' đương đại', accent: false },
    ])
  })
  it('accent at start', () => {
    expect(splitTitle('Sắc màu kí ức', 'Sắc màu')).toEqual([
      { text: 'Sắc màu', accent: true },
      { text: ' kí ức', accent: false },
    ])
  })
  it('no or missing accent returns whole title', () => {
    expect(splitTitle('Kí ức', null)).toEqual([{ text: 'Kí ức', accent: false }])
    expect(splitTitle('Kí ức', 'xyz')).toEqual([{ text: 'Kí ức', accent: false }])
  })
})
```

- [ ] **Step 3: Run to verify failure**

Run: `pnpm --filter web test`
Expected: FAIL — cannot find module `../../src/lib/title`

- [ ] **Step 4: Implement**

`apps/web/src/lib/title.ts`:
```ts
export type TitlePart = { text: string; accent: boolean }

export function splitTitle(title: string, accent?: string | null): TitlePart[] {
  if (!accent) return [{ text: title, accent: false }]
  const i = title.toLowerCase().indexOf(accent.toLowerCase())
  if (i < 0) return [{ text: title, accent: false }]
  const parts: TitlePart[] = []
  if (i > 0) parts.push({ text: title.slice(0, i), accent: false })
  parts.push({ text: title.slice(i, i + accent.length), accent: true })
  if (i + accent.length < title.length) parts.push({ text: title.slice(i + accent.length), accent: false })
  return parts
}
```

- [ ] **Step 5: Run to verify pass**

Run: `pnpm --filter web test`
Expected: `3 passed`

- [ ] **Step 6: Fixtures**

Create fixtures shaped like Payload REST responses (2 articles is enough; the e2e test relies on these exact values):

`apps/web/tests/fixtures/articles.json`:
```json
{
  "docs": [
    {
      "id": 1, "slug": "hoi-hoa-viet-nam-duong-dai", "title": "Hội họa Việt Nam đương đại", "titleAccent": "Việt Nam",
      "kicker": null, "sapo": "NDO - Dẫu hòa vào dòng chảy của mỹ thuật đương đại, các họa sĩ vẫn giữ lối riêng.",
      "heroImage": { "url": "/brand/cover.jpg", "alt": "Tranh minh họa", "width": 1600, "height": 1131 },
      "page": 3, "featured": true, "author": null,
      "bodyHtml": "<p>Triển lãm \"Hiện thực +\" vừa diễn ra tại Bảo tàng Mỹ thuật Việt Nam.</p><blockquote class=\"pullquote\"><p>Càng vẽ những điều giản dị.</p></blockquote><p>Đoạn thứ hai có dấu: ắ ặ ẫ ỡ ữ đ.</p><p>Đoạn thứ ba.</p>"
    },
    {
      "id": 2, "slug": "sac-mau-ki-uc", "title": "Sắc màu kí ức", "titleAccent": "Sắc màu", "kicker": null,
      "sapo": "Những gam màu cũ, những miền kí ức vẫn còn hiện hữu trong tranh.", "heroImage": null,
      "page": 5, "featured": false, "author": null, "bodyHtml": "<p>Trong hội họa Việt Nam, kí ức là chất liệu.</p>"
    }
  ]
}
```

`apps/web/tests/fixtures/issues.json`:
```json
{ "docs": [{ "id": 1, "number": "034", "period": "1-2/2027", "isCurrent": true, "coverImage": null }] }
```

`apps/web/tests/fixtures/foreword.json`:
```json
{ "title": "Lời ngỏ", "bodyHtml": "<p>Hội họa Việt Nam đương đại là sự giao thoa giữa những giá trị truyền thống và tinh thần sáng tạo mới.</p>", "signature": "Trân trọng!" }
```

`apps/web/tests/fixtures/masthead.json`:
```json
{
  "board": [
    { "role": "Tổng biên tập", "names": [{ "name": "Nguyễn Thị Cẩm Tú" }] },
    { "role": "Biên tập", "names": [{ "name": "Nguyễn Huy Nhật" }, { "name": "Tạ Thị Ngánh" }] }
  ],
  "publisher": "Nhà xuất bản Tuổi Trẻ",
  "address": "161B Lý Chính Thắng, Phường Võ Thị Sáu, Quận 1, TP Hồ Chí Minh",
  "phone": "0982093005", "website": "tapchimithuat.vn", "email": "tapchimythuat.gmail.com",
  "coverCredit": "Bìa sử dụng tranh của họa sĩ Vũ Đình Tuấn"
}
```

- [ ] **Step 7: Write failing CMS client test**

`apps/web/tests/unit/cms.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); vi.unstubAllGlobals() })

describe('cms client (fixtures)', () => {
  it('reads fixtures when CMS_FIXTURES=1 and sorts by page', async () => {
    vi.stubEnv('CMS_FIXTURES', '1')
    const cms = await import('../../src/lib/cms')
    const arts = await cms.getArticles()
    expect(arts.map((a) => a.page)).toEqual([3, 5])
    expect((await cms.getArticle('sac-mau-ki-uc'))?.title).toBe('Sắc màu kí ức')
    expect((await cms.getCurrentIssue())?.number).toBe('034')
  })
})

describe('cms client (http)', () => {
  it('throws a clear error when CMS_URL is missing', async () => {
    vi.stubEnv('CMS_FIXTURES', '')
    vi.stubEnv('CMS_URL', '')
    const cms = await import('../../src/lib/cms')
    await expect(cms.getArticles()).rejects.toThrow('Missing env var: CMS_URL')
  })
  it('requests published articles with depth and fails loudly on HTTP error', async () => {
    vi.stubEnv('CMS_FIXTURES', '')
    vi.stubEnv('CMS_URL', 'https://cms.example')
    const fetchMock = vi.fn().mockResolvedValue(new Response('down', { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)
    const cms = await import('../../src/lib/cms')
    await expect(cms.getArticles()).rejects.toThrow('CMS 503')
    const url = new URL(fetchMock.mock.calls[0][0])
    expect(url.pathname).toBe('/api/articles')
    expect(url.searchParams.get('where[_status][equals]')).toBe('published')
    expect(url.searchParams.get('sort')).toBe('page')
  })
})
```

- [ ] **Step 8: Run to verify failure**

Run: `pnpm --filter web test`
Expected: FAIL — cannot find module `../../src/lib/cms`

- [ ] **Step 9: Implement types + client**

`apps/web/src/lib/types.ts`:
```ts
export type Media = { url: string; alt: string; width?: number; height?: number; caption?: string | null }
export type Article = {
  id: number | string; slug: string; title: string; titleAccent?: string | null; kicker?: string | null
  sapo?: string | null; heroImage?: Media | null; page: number; featured?: boolean | null
  author?: string | null; bodyHtml?: string | null
}
export type Issue = { number: string; period: string; coverImage?: Media | null }
export type Foreword = { title: string; bodyHtml?: string | null; signature?: string | null }
export type Masthead = {
  board: { role: string; names: { name: string }[] }[]
  publisher?: string | null; address?: string | null; phone?: string | null
  website?: string | null; email?: string | null; coverCredit?: string | null
}
```

`apps/web/src/lib/cms.ts`:
```ts
import { readFile } from 'node:fs/promises'
import type { Article, Foreword, Issue, Masthead } from './types'

const useFixtures = () => process.env.CMS_FIXTURES === '1'
const fixtureDir = new URL('../../tests/fixtures/', import.meta.url)

async function fixture<T>(name: string): Promise<T> {
  return JSON.parse(await readFile(new URL(`${name}.json`, fixtureDir), 'utf8')) as T
}

async function api<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const base = process.env.CMS_URL
  if (!base) throw new Error('Missing env var: CMS_URL')
  const url = new URL(`/api/${path}`, base)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`CMS ${res.status} for ${url.pathname}: ${await res.text()}`)
  return (await res.json()) as T
}

let articlesCache: Promise<Article[]> | undefined

export function getArticles(): Promise<Article[]> {
  articlesCache ??= (async () => {
    const data = useFixtures()
      ? await fixture<{ docs: Article[] }>('articles')
      : await api<{ docs: Article[] }>('articles', {
          'where[_status][equals]': 'published', sort: 'page', depth: '1', limit: '200',
        })
    return [...data.docs].sort((a, b) => a.page - b.page)
  })()
  return articlesCache
}

export async function getArticle(slug: string) {
  return (await getArticles()).find((a) => a.slug === slug)
}

export async function getCurrentIssue(): Promise<Issue | undefined> {
  const data = useFixtures()
    ? await fixture<{ docs: Issue[] }>('issues')
    : await api<{ docs: Issue[] }>('issues', { 'where[isCurrent][equals]': 'true', depth: '1', limit: '1' })
  return data.docs[0]
}

export const getForeword = () => (useFixtures() ? fixture<Foreword>('foreword') : api<Foreword>('globals/foreword'))
export const getMasthead = () => (useFixtures() ? fixture<Masthead>('masthead') : api<Masthead>('globals/masthead'))
```

- [ ] **Step 10: Run to verify pass**

Run: `pnpm --filter web test`
Expected: all pass.

- [ ] **Step 11: Design tokens + global CSS**

`apps/web/src/styles/tokens.css` (use sampled values from Task 2 if they differed):
```css
:root {
  --cream: #F1E6D3;
  --cream-deep: #E8D9BF;
  --maroon: #6B1E1E;
  --orange: #E07B3A;
  --beige: #C9B29B;
  --ink: #2B2420;
  --ink-soft: #5A4D44;
  --rule: #B59C82;

  --font-display: 'Oswald', 'Arial Narrow', sans-serif;
  --font-body: 'Be Vietnam Pro', system-ui, sans-serif;

  --step--1: clamp(0.83rem, 0.8rem + 0.15vw, 0.9rem);
  --step-0: clamp(1rem, 0.96rem + 0.2vw, 1.1rem);
  --step-1: clamp(1.25rem, 1.1rem + 0.6vw, 1.6rem);
  --step-2: clamp(1.6rem, 1.3rem + 1.4vw, 2.4rem);
  --step-3: clamp(2.2rem, 1.6rem + 3vw, 4rem);
  --step-4: clamp(2.8rem, 1.8rem + 5vw, 6rem);

  --gutter: 16px;
  --max: 1240px;
}
@media (min-width: 768px) { :root { --gutter: 32px; } }
```

`apps/web/src/styles/global.css`:
```css
@import '@fontsource/oswald/600.css';
@import '@fontsource/oswald/700.css';
@import '@fontsource/be-vietnam-pro/400.css';
@import '@fontsource/be-vietnam-pro/400-italic.css';
@import '@fontsource/be-vietnam-pro/600.css';
@import './tokens.css';

*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0; background: var(--cream); color: var(--ink);
  font-family: var(--font-body); font-size: var(--step-0); line-height: 1.65;
  overflow-x: hidden;
}
img { max-width: 100%; height: auto; display: block; }
a { color: inherit; }
h1, h2, h3 {
  font-family: var(--font-display); font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.01em; line-height: 1.02; color: var(--maroon); margin: 0;
}
.wrap { max-width: var(--max); margin-inline: auto; padding-inline: var(--gutter); }
.accent { color: var(--orange); }
.eyebrow { font-family: var(--font-display); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; font-size: var(--step--1); color: var(--orange); }
.rule { border: 0; border-top: 1px solid var(--rule); margin: 0; }
:focus-visible { outline: 2px solid var(--orange); outline-offset: 2px; }
```

- [ ] **Step 12: Commit**

```bash
git add apps/web pnpm-lock.yaml
git commit -m "feat(web): scaffold Astro site with tokens and CMS client"
```

---

### Task 10: Layout, masthead, footer, two-tone title

**Files:**
- Create: `apps/web/src/layouts/Base.astro`, `apps/web/src/components/Masthead.astro`, `apps/web/src/components/Footer.astro`, `apps/web/src/components/TwoToneTitle.astro`

**Interfaces:**
- Consumes: `getCurrentIssue`, `getMasthead`, `splitTitle`, types (Task 9); `/brand/*.png` (Task 2)
- Produces:
  - `<Base title: string description?: string compactMasthead?: boolean>` with default slot
  - `<TwoToneTitle title: string accent?: string|null kicker?: string|null as?: 'h1'|'h2'|'h3' size?: 'xl'|'lg'|'md'>`

- [ ] **Step 1: TwoToneTitle**

`apps/web/src/components/TwoToneTitle.astro`:
```astro
---
import { splitTitle } from '../lib/title'
interface Props { title: string; accent?: string | null; kicker?: string | null; as?: 'h1' | 'h2' | 'h3'; size?: 'xl' | 'lg' | 'md' }
const { title, accent, kicker, as: Tag = 'h2', size = 'lg' } = Astro.props
const parts = splitTitle(title, accent)
---
<Tag class={`ttitle ttitle--${size}`}>
  {kicker && <span class="ttitle__kicker">{kicker}</span>}
  {parts.map((p) => (p.accent ? <span class="accent">{p.text}</span> : p.text))}
</Tag>
<style>
  .ttitle { text-wrap: balance; }
  .ttitle--xl { font-size: var(--step-4); }
  .ttitle--lg { font-size: var(--step-3); }
  .ttitle--md { font-size: var(--step-1); }
  .ttitle__kicker { display: block; font-size: 0.4em; color: var(--orange); letter-spacing: 0.06em; margin-bottom: 0.2em; }
</style>
```

- [ ] **Step 2: Masthead**

`apps/web/src/components/Masthead.astro`:
```astro
---
import { getCurrentIssue } from '../lib/cms'
interface Props { compact?: boolean }
const { compact = false } = Astro.props
const issue = await getCurrentIssue()
---
<header class:list={['mh', { 'mh--compact': compact }]}>
  <img class="mh__cloud mh__cloud--top" src="/brand/cloud-top.png" alt="" aria-hidden="true" />
  <img class="mh__cloud mh__cloud--right" src="/brand/cloud-right.png" alt="" aria-hidden="true" />
  <div class="wrap mh__inner">
    <a href="/" class="mh__logo" aria-label="Tạp chí Mỹ thuật — Trang chủ">
      <img src="/brand/masthead.png" alt="Tạp chí Mỹ thuật — Fine Arts Magazine" />
    </a>
    {issue && (
      <div class="mh__badge" aria-label={`Số ${issue.number}, kỳ ${issue.period}`}>
        <span class="mh__badge-label">Số</span>
        <span class="mh__badge-num">{issue.number}</span>
        <span class="mh__badge-period">{issue.period}</span>
      </div>
    )}
  </div>
  <nav class="wrap mh__nav" aria-label="Chính">
    <a href="/">Trang chủ</a>
    <a href="/muc-luc">Mục lục</a>
    <a href="/#loi-ngo">Lời ngỏ</a>
  </nav>
</header>
<style>
  .mh { position: relative; overflow: hidden; padding-block: 24px 0; border-bottom: 3px double var(--maroon); }
  .mh__cloud { position: absolute; pointer-events: none; opacity: 0.9; }
  .mh__cloud--top { top: -40px; left: -60px; width: min(55vw, 560px); }
  .mh__cloud--right { right: -80px; bottom: -30px; width: min(45vw, 460px); }
  .mh__inner { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .mh__logo img { width: clamp(220px, 48vw, 520px); }
  .mh__badge {
    flex: none; width: clamp(76px, 12vw, 120px); aspect-ratio: 1; border-radius: 50%;
    border: 3px solid var(--maroon); display: grid; place-content: center; text-align: center; line-height: 1;
    color: var(--maroon); background: color-mix(in srgb, var(--cream) 85%, transparent);
  }
  .mh__badge-label { font-family: var(--font-display); font-size: 0.8em; text-transform: uppercase; }
  .mh__badge-num { font-family: var(--font-display); font-weight: 700; color: var(--orange); font-size: clamp(1.6rem, 4vw, 2.6rem); }
  .mh__badge-period { font-size: 0.7rem; margin-top: 2px; }
  .mh__nav { position: relative; display: flex; gap: 24px; padding-block: 14px; font-family: var(--font-display); text-transform: uppercase; letter-spacing: 0.08em; font-size: var(--step--1); }
  .mh__nav a { text-decoration: none; color: var(--maroon); }
  .mh__nav a:hover { color: var(--orange); }
  .mh--compact { padding-block: 12px 0; }
  .mh--compact .mh__logo img { width: clamp(160px, 30vw, 300px); }
  .mh--compact .mh__badge { width: 70px; }
</style>
```

- [ ] **Step 3: Footer**

`apps/web/src/components/Footer.astro`:
```astro
---
import { getMasthead } from '../lib/cms'
const m = await getMasthead()
---
<footer class="ft">
  <div class="wrap ft__grid">
    <div>
      <p class="eyebrow">Ban biên tập</p>
      <dl class="ft__board">
        {m.board.map((b) => (
          <div><dt>{b.role}</dt>{b.names.map((n) => <dd>{n.name}</dd>)}</div>
        ))}
      </dl>
    </div>
    <div class="ft__pub">
      <p class="eyebrow">Xuất bản</p>
      {m.publisher && <p><strong>{m.publisher}</strong></p>}
      {m.address && <p>Địa chỉ: {m.address}</p>}
      {m.phone && <p>Điện thoại: {m.phone}</p>}
      {m.website && <p>Website: {m.website}</p>}
      {m.email && <p>Email: {m.email}</p>}
      {m.coverCredit && <p class="ft__credit">{m.coverCredit}</p>}
    </div>
  </div>
</footer>
<style>
  .ft { background: var(--maroon); color: var(--cream); padding-block: 48px; margin-top: 64px; }
  .ft .eyebrow { color: var(--orange); }
  .ft__grid { display: grid; gap: 32px; }
  @media (min-width: 768px) { .ft__grid { grid-template-columns: 2fr 1fr; } }
  .ft__board { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px 24px; margin: 0; }
  .ft__board dt { font-weight: 600; font-size: var(--step--1); opacity: 0.8; }
  .ft__board dd { margin: 0; text-transform: uppercase; font-family: var(--font-display); letter-spacing: 0.03em; }
  .ft__pub p { margin: 0 0 6px; font-size: var(--step--1); }
  .ft__credit { font-style: italic; margin-top: 16px !important; }
</style>
```

- [ ] **Step 4: Base layout**

`apps/web/src/layouts/Base.astro`:
```astro
---
import '../styles/global.css'
import Footer from '../components/Footer.astro'
import Masthead from '../components/Masthead.astro'
interface Props { title: string; description?: string; compactMasthead?: boolean }
const { title, description = 'Tạp chí Mỹ thuật — Fine Arts Magazine, Hội Mỹ thuật Việt Nam', compactMasthead = false } = Astro.props
---
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <link rel="icon" href="/brand/masthead.png" />
  </head>
  <body>
    <Masthead compact={compactMasthead} />
    <main><slot /></main>
    <Footer />
  </body>
</html>
```

- [ ] **Step 5: Smoke build with fixtures**

Create a temporary `apps/web/src/pages/index.astro`:
```astro
---
import Base from '../layouts/Base.astro'
---
<Base title="Tạp chí Mỹ thuật"><p class="wrap">Đang dựng…</p></Base>
```
Run: `CMS_FIXTURES=1 pnpm --filter web build` (PowerShell: `$env:CMS_FIXTURES='1'; pnpm --filter web build`)
Expected: build succeeds; `apps/web/dist/index.html` contains `034` and `Nguyễn Thị Cẩm Tú`.

- [ ] **Step 6: Visual check**

Run `CMS_FIXTURES=1 pnpm --filter web dev`, take a screenshot at 1280 px and 375 px (use the `run` skill or Playwright `page.screenshot`), Read them. Masthead must resemble the PSD top area: logo left, round badge right, clouds behind, cream background, no horizontal scroll at 375 px.

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat(web): add masthead, footer and base layout"
```

---

### Task 11: Home page

**Files:**
- Create: `apps/web/src/components/FeaturedArticle.astro`, `apps/web/src/components/ArticleCard.astro`, `apps/web/src/components/Foreword.astro`
- Modify: `apps/web/src/pages/index.astro`

**Interfaces:**
- Consumes: `getArticles`, `getForeword`, `TwoToneTitle`, `Base`
- Produces: home page with `data-testid="featured"`, `data-testid="article-card"` (one per non-featured article), `id="loi-ngo"`.

- [ ] **Step 1: FeaturedArticle**

`apps/web/src/components/FeaturedArticle.astro`:
```astro
---
import type { Article } from '../lib/types'
import TwoToneTitle from './TwoToneTitle.astro'
interface Props { article: Article }
const { article: a } = Astro.props
---
<article class="feat" data-testid="featured">
  <a href={`/bai/${a.slug}`} class="feat__link">
    {a.heroImage?.url && (
      <div class="feat__media">
        <img src={a.heroImage.url} alt={a.heroImage.alt} width={a.heroImage.width} height={a.heroImage.height} loading="eager" fetchpriority="high" />
      </div>
    )}
    <div class="feat__text">
      <p class="eyebrow">Tiêu điểm · Trang {a.page}</p>
      <TwoToneTitle title={a.title} accent={a.titleAccent} kicker={a.kicker} as="h2" size="xl" />
      {a.sapo && <p class="feat__sapo">{a.sapo}</p>}
    </div>
  </a>
</article>
<style>
  .feat__link { display: grid; gap: 24px; text-decoration: none; }
  @media (min-width: 900px) { .feat__link { grid-template-columns: 1.4fr 1fr; align-items: end; } }
  .feat__media { position: relative; }
  .feat__media::after { content: ''; position: absolute; inset: 18px -18px -18px 18px; background: var(--beige); z-index: -1; }
  .feat__media img { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; }
  .feat__sapo { font-style: italic; font-size: var(--step-1); line-height: 1.45; color: var(--ink-soft); margin: 16px 0 0; }
  .feat__link:hover :global(.ttitle) { text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 6px; }
</style>
```

- [ ] **Step 2: ArticleCard**

`apps/web/src/components/ArticleCard.astro`:
```astro
---
import type { Article } from '../lib/types'
import TwoToneTitle from './TwoToneTitle.astro'
interface Props { article: Article }
const { article: a } = Astro.props
---
<article class="card" data-testid="article-card">
  <a href={`/bai/${a.slug}`} class="card__link">
    <div class="card__media">
      {a.heroImage?.url
        ? <img src={a.heroImage.url} alt={a.heroImage.alt} width={a.heroImage.width} height={a.heroImage.height} loading="lazy" />
        : <div class="card__placeholder" aria-hidden="true"></div>}
    </div>
    <p class="eyebrow">Trang {a.page}</p>
    <TwoToneTitle title={a.title} accent={a.titleAccent} as="h3" size="md" />
    {a.sapo && <p class="card__sapo">{a.sapo}</p>}
  </a>
</article>
<style>
  .card__link { display: grid; gap: 8px; text-decoration: none; }
  .card__media img, .card__placeholder { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; background: var(--beige); }
  .card__sapo { margin: 0; font-size: var(--step--1); color: var(--ink-soft); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .card__link:hover :global(.ttitle) { color: var(--orange); }
</style>
```

- [ ] **Step 3: Foreword**

`apps/web/src/components/Foreword.astro`:
```astro
---
import { getForeword } from '../lib/cms'
const f = await getForeword()
---
<section id="loi-ngo" class="fw">
  <div class="wrap fw__inner">
    <h2 class="fw__title">{f.title}</h2>
    <div class="fw__body">
      {f.bodyHtml && <Fragment set:html={f.bodyHtml} />}
      {f.signature && <p class="fw__sig">{f.signature}</p>}
    </div>
  </div>
</section>
<style>
  .fw { background: var(--cream-deep); padding-block: 56px; margin-top: 64px; }
  .fw__inner { display: grid; gap: 24px; }
  @media (min-width: 900px) { .fw__inner { grid-template-columns: 1fr 2fr; } }
  .fw__title { font-size: var(--step-3); }
  .fw__body :global(p) { margin: 0 0 1em; max-width: 68ch; }
  .fw__sig { font-style: italic; color: var(--maroon); }
</style>
```

- [ ] **Step 4: Home page**

`apps/web/src/pages/index.astro`:
```astro
---
import ArticleCard from '../components/ArticleCard.astro'
import FeaturedArticle from '../components/FeaturedArticle.astro'
import Foreword from '../components/Foreword.astro'
import Base from '../layouts/Base.astro'
import { getArticles } from '../lib/cms'

const articles = await getArticles()
const featured = articles.find((a) => a.featured) ?? articles[0]
const rest = articles.filter((a) => a !== featured)
---
<Base title="Tạp chí Mỹ thuật — Fine Arts Magazine">
  <div class="wrap home">
    {featured && <FeaturedArticle article={featured} />}
    <hr class="rule" />
    <section aria-labelledby="trong-so-nay">
      <h2 id="trong-so-nay" class="home__h">Trong số này</h2>
      <div class="home__grid">
        {rest.map((a) => <ArticleCard article={a} />)}
      </div>
    </section>
  </div>
  <Foreword />
</Base>
<style>
  .home { display: grid; gap: 48px; padding-top: 40px; }
  .home__h { font-size: var(--step-2); margin-bottom: 24px; }
  .home__grid { display: grid; gap: 40px 32px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); }
</style>
```

- [ ] **Step 5: Build + visual check**

Run: `$env:CMS_FIXTURES='1'; pnpm --filter web build`
Expected: success. Then dev server + screenshots at 1280 px and 375 px; Read them. Featured block shows two-tone title (VIỆT NAM in orange), beige offset block behind the image; grid shows 1 card in fixtures.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(web): build home page with featured article, grid and foreword"
```

---

### Task 12: Article detail page

**Files:**
- Create: `apps/web/src/pages/bai/[slug].astro`, `apps/web/src/styles/article.css`

**Interfaces:**
- Consumes: `getArticles`, `TwoToneTitle`, `Base`
- Produces: `/bai/{slug}` pages; DOM hooks `data-testid="article-title"`, `.art__body` (multi-column container), `data-testid="prev-next"`.

- [ ] **Step 1: Article CSS**

`apps/web/src/styles/article.css`:
```css
.art { padding-top: 40px; }
.art__head { display: grid; gap: 20px; margin-bottom: 40px; }
@media (min-width: 900px) { .art__head { grid-template-columns: 3fr 2fr; align-items: end; } }
.art__sapo { font-style: italic; font-weight: 600; font-size: var(--step-1); line-height: 1.45; color: var(--maroon); margin: 0; border-left: 4px solid var(--orange); padding-left: 16px; }
.art__hero { position: relative; margin: 0 0 48px; }
.art__hero::before { content: ''; position: absolute; inset: -20px 30% 40% -20px; background: var(--beige); z-index: -1; }
.art__hero img { width: 100%; max-height: 70vh; object-fit: cover; }

.art__body { columns: 1; column-gap: 32px; column-rule: 1px solid color-mix(in srgb, var(--rule) 50%, transparent); text-align: justify; hyphens: auto; }
@media (min-width: 768px) { .art__body { columns: 2; } }
@media (min-width: 1200px) { .art__body { columns: 3; } }
.art__body p { margin: 0 0 1em; }
.art__body > p:first-of-type::first-letter {
  float: left; font-family: var(--font-display); font-weight: 700; color: var(--maroon);
  font-size: 4.2em; line-height: 0.85; padding: 0.05em 0.08em 0 0;
}
.art__body .fig { break-inside: avoid; margin: 0 0 1.2em; }
.art__body .fig--full { column-span: all; margin-block: 1.5em; }
.art__body figcaption { font-size: var(--step--1); font-style: italic; color: var(--ink-soft); margin-top: 6px; }
.art__body .pullquote {
  column-span: all; margin: 1.5em auto; max-width: 42ch; text-align: center;
  font-family: var(--font-display); font-size: var(--step-2); text-transform: uppercase; color: var(--orange); line-height: 1.15;
}
.art__body .pullquote p { margin: 0; }
.art__body .pullquote cite { display: block; font-size: var(--step--1); color: var(--ink-soft); font-style: normal; margin-top: 8px; }
.art__body .gallery { column-span: all; display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); margin-block: 1.5em; }
.art__body .gallery img { width: 100%; aspect-ratio: 1; object-fit: cover; }
.art__foot { display: flex; justify-content: space-between; gap: 16px; margin-top: 48px; padding-top: 16px; border-top: 1px solid var(--rule); font-family: var(--font-display); text-transform: uppercase; }
.art__foot a { text-decoration: none; color: var(--maroon); max-width: 45%; }
.art__foot a:hover { color: var(--orange); }
.art__folio { text-align: right; font-size: var(--step--1); color: var(--ink-soft); margin-top: 12px; }
```

- [ ] **Step 2: Page**

`apps/web/src/pages/bai/[slug].astro`:
```astro
---
import '../../styles/article.css'
import TwoToneTitle from '../../components/TwoToneTitle.astro'
import Base from '../../layouts/Base.astro'
import { getArticles } from '../../lib/cms'
import type { Article } from '../../lib/types'

export async function getStaticPaths() {
  const articles = await getArticles()
  return articles.map((article, i) => ({
    params: { slug: article.slug },
    props: { article, prev: articles[i - 1], next: articles[i + 1] },
  }))
}

interface Props { article: Article; prev?: Article; next?: Article }
const { article: a, prev, next } = Astro.props
---
<Base title={`${a.title} — Tạp chí Mỹ thuật`} description={a.sapo ?? undefined} compactMasthead>
  <article class="wrap art">
    <header class="art__head">
      <div data-testid="article-title">
        <TwoToneTitle title={a.title} accent={a.titleAccent} kicker={a.kicker} as="h1" size="xl" />
        {a.author && <p class="eyebrow">{a.author}</p>}
      </div>
      {a.sapo && <p class="art__sapo">{a.sapo}</p>}
    </header>
    {a.heroImage?.url && (
      <figure class="art__hero">
        <img src={a.heroImage.url} alt={a.heroImage.alt} width={a.heroImage.width} height={a.heroImage.height} loading="eager" fetchpriority="high" />
      </figure>
    )}
    <div class="art__body">{a.bodyHtml && <Fragment set:html={a.bodyHtml} />}</div>
    <p class="art__folio">Mỹ Thuật {a.page}</p>
    <nav class="art__foot" data-testid="prev-next" aria-label="Bài khác">
      {prev ? <a href={`/bai/${prev.slug}`} rel="prev">← {prev.title}</a> : <span></span>}
      {next ? <a href={`/bai/${next.slug}`} rel="next">{next.title} →</a> : <span></span>}
    </nav>
  </article>
</Base>
```

- [ ] **Step 3: Build + visual check**

Run: `$env:CMS_FIXTURES='1'; pnpm --filter web build`
Expected: `dist/bai/hoi-hoa-viet-nam-duong-dai/index.html` and `dist/bai/sac-mau-ki-uc/index.html` exist.

Screenshot `/bai/hoi-hoa-viet-nam-duong-dai` at 1280 px and 375 px, plus PDF page 3 rendered at 60 dpi; Read all three and compare: large two-tone title, bold italic sapo with orange rule, drop cap, multi-column body at desktop, single column on mobile, beige block behind hero. Fix CSS until it reads as the same visual family.

- [ ] **Step 4: Commit**

```bash
git add apps/web
git commit -m "feat(web): add magazine-style article detail page"
```

---

### Task 13: Mục lục + 404

**Files:**
- Create: `apps/web/src/pages/muc-luc.astro`, `apps/web/src/pages/404.astro`

**Interfaces:**
- Consumes: `getArticles`, `splitTitle`, `Base`
- Produces: `/muc-luc` with `data-testid="toc-item"` per article; `/404`.

- [ ] **Step 1: Mục lục**

`apps/web/src/pages/muc-luc.astro`:
```astro
---
import Base from '../layouts/Base.astro'
import { getArticles } from '../lib/cms'
import { splitTitle } from '../lib/title'
const articles = await getArticles()
---
<Base title="Mục lục — Tạp chí Mỹ thuật" compactMasthead>
  <div class="wrap toc">
    <h1 class="toc__h">Mục lục</h1>
    <ol class="toc__list">
      {articles.map((a) => (
        <li data-testid="toc-item">
          <a href={`/bai/${a.slug}`}>
            <span class="toc__title">
              {splitTitle(a.title, a.titleAccent).map((p) => (p.accent ? <span class="accent">{p.text}</span> : p.text))}
            </span>
            <span class="toc__dots" aria-hidden="true"></span>
            <span class="toc__page">{a.page}</span>
          </a>
          {a.sapo && <p class="toc__sapo">{a.sapo}</p>}
        </li>
      ))}
    </ol>
  </div>
</Base>
<style>
  .toc { max-width: 820px; padding-top: 40px; }
  .toc__h { font-size: var(--step-4); margin-bottom: 32px; }
  .toc__list { list-style: none; padding: 0; margin: 0; display: grid; gap: 28px; }
  .toc__list a { display: flex; align-items: baseline; gap: 12px; text-decoration: none; }
  .toc__title { font-family: var(--font-display); font-weight: 700; text-transform: uppercase; font-size: var(--step-1); color: var(--maroon); }
  .toc__dots { flex: 1; border-bottom: 2px dotted var(--rule); transform: translateY(-4px); }
  .toc__page { font-family: var(--font-display); font-size: var(--step-1); color: var(--orange); }
  .toc__sapo { margin: 4px 0 0; color: var(--ink-soft); font-size: var(--step--1); }
  .toc__list a:hover .toc__title { color: var(--orange); }
</style>
```

- [ ] **Step 2: 404**

`apps/web/src/pages/404.astro`:
```astro
---
import Base from '../layouts/Base.astro'
---
<Base title="Không tìm thấy trang — Tạp chí Mỹ thuật" compactMasthead>
  <div class="wrap nf">
    <h1>Không tìm thấy trang</h1>
    <p>Bài viết có thể đã được gỡ hoặc đổi đường dẫn.</p>
    <p><a href="/">Về trang chủ</a> · <a href="/muc-luc">Xem mục lục</a></p>
  </div>
</Base>
<style>
  .nf { padding-block: 80px; text-align: center; }
  .nf h1 { font-size: var(--step-3); margin-bottom: 16px; }
</style>
```

- [ ] **Step 3: Build**

Run: `$env:CMS_FIXTURES='1'; pnpm --filter web build`
Expected: `dist/muc-luc/index.html` and `dist/404.html` exist.

- [ ] **Step 4: Commit**

```bash
git add apps/web
git commit -m "feat(web): add table of contents and 404 pages"
```

---

### Task 14: E2E smoke tests (Playwright)

**Files:**
- Create: `apps/web/playwright.config.ts`, `apps/web/tests/e2e/site.spec.ts`

**Interfaces:**
- Consumes: fixtures (Task 9), test ids from Tasks 11–13.

- [ ] **Step 1: Config**

`apps/web/playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: 'http://localhost:4321' },
  webServer: {
    command: 'pnpm build && pnpm preview --port 4321',
    url: 'http://localhost:4321',
    env: { CMS_FIXTURES: '1' },
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
})
```

- [ ] **Step 2: Tests**

`apps/web/tests/e2e/site.spec.ts`:
```ts
import { expect, test } from '@playwright/test'

test('home shows masthead, featured, grid and foreword', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByAltText('Tạp chí Mỹ thuật — Fine Arts Magazine')).toBeVisible()
  await expect(page.getByLabel('Số 034, kỳ 1-2/2027')).toBeVisible()
  await expect(page.getByTestId('featured')).toContainText('Hội họa')
  await expect(page.getByTestId('article-card')).toHaveCount(1)
  await expect(page.locator('#loi-ngo')).toContainText('Lời ngỏ')
  await expect(page.locator('footer')).toContainText('Nguyễn Thị Cẩm Tú')
})

test('article page renders two-tone title, body and nav', async ({ page }) => {
  await page.goto('/bai/hoi-hoa-viet-nam-duong-dai')
  const title = page.getByTestId('article-title')
  await expect(title.locator('.accent')).toHaveText('Việt Nam')
  await expect(page.locator('.art__body')).toContainText('Triển lãm')
  await expect(page.locator('.art__body')).toContainText('ắ ặ ẫ ỡ ữ đ')
  await expect(page.getByTestId('prev-next').getByRole('link')).toHaveText(/Sắc màu kí ức/)
})

test('article body uses columns on desktop only', async ({ page }, info) => {
  await page.goto('/bai/hoi-hoa-viet-nam-duong-dai')
  const cols = await page.locator('.art__body').evaluate((el) => getComputedStyle(el).columnCount)
  expect(cols).toBe(info.project.name === 'mobile' ? '1' : '3')
})

test('table of contents lists articles in page order', async ({ page }) => {
  await page.goto('/muc-luc')
  const items = page.getByTestId('toc-item')
  await expect(items).toHaveCount(2)
  await expect(items.nth(0)).toContainText('3')
  await expect(items.nth(1)).toContainText('5')
})

test('no horizontal overflow', async ({ page }) => {
  for (const path of ['/', '/bai/hoi-hoa-viet-nam-duong-dai', '/muc-luc']) {
    await page.goto(path)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, path).toBeLessThanOrEqual(0)
  }
})

test('fonts with Vietnamese glyphs load', async ({ page }) => {
  await page.goto('/bai/hoi-hoa-viet-nam-duong-dai')
  await page.evaluate(() => document.fonts.ready)
  const loaded = await page.evaluate(() => ({
    oswald: document.fonts.check('700 16px Oswald', 'Việt'),
    body: document.fonts.check('400 16px "Be Vietnam Pro"', 'ặ'),
  }))
  expect(loaded).toEqual({ oswald: true, body: true })
})

test('unknown route shows 404 page', async ({ page }) => {
  const res = await page.goto('/khong-ton-tai')
  expect(res?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible()
})
```

Desktop Chrome viewport is 1280 px → between 768 and 1200? No: 1280 ≥ 1200 → 3 columns. Pixel 7 is 412 px → 1 column.

- [ ] **Step 3: Run**

```bash
pnpm --filter web exec playwright install chromium
pnpm --filter web e2e
```
Expected: 14 passed (7 tests × 2 projects). Fix the site (not the tests) on failure, unless a test asserts something the spec doesn't require.

- [ ] **Step 4: Commit**

```bash
git add apps/web
git commit -m "test(web): add Playwright smoke tests for home, article, TOC and 404"
```

---

### Task 15: Deploy both apps and verify the webhook end to end

**Files:**
- Create: `apps/web/vercel.json` (optional, only if build settings need overriding)
- Modify: none in code unless a deploy issue requires it

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Deploy CMS**

From `apps/cms` (already linked in Task 8): ensure Vercel project Root Directory = `apps/cms`, framework = Next.js. Add production env var `WEB_DEPLOY_HOOK_URL` after Step 3. Then:
```bash
vercel deploy --prod
```
Expected: deployment URL; `/admin` loads and seed admin can log in. Production DB is the same Neon DB (env vars from integration apply to all environments); verify `GET https://<cms>/api/articles?limit=1` returns the seeded article.

- [ ] **Step 2: Create and deploy web project**

From `apps/web`:
```bash
vercel link --yes --project tap-chi-my-thuat-web
vercel env add CMS_URL production preview   # value: https://<cms production domain>
vercel env add SITE_URL production          # value: https://<web production domain>
vercel deploy --prod
```
Root Directory = `apps/web`, framework = Astro. Expected: site live with 8 articles.

- [ ] **Step 3: Create Deploy Hook and wire it**

Ask the user to create a Deploy Hook in the web project (Vercel dashboard → tap-chi-my-thuat-web → Settings → Git → Deploy Hooks; requires the project to be connected to a Git repository — if it is not, connect it first or ask the user). Then:
```bash
cd apps/cms
vercel env add WEB_DEPLOY_HOOK_URL production   # paste the hook URL
vercel deploy --prod
```

- [ ] **Step 4: End-to-end webhook check**

1. In production admin, edit "Sắc màu kí ức" sapo (append " (thử nghiệm)"), Publish.
2. Within ~30 s, `rebuild-status` global shows `OK (201)` (or `OK (200)`).
3. `vercel ls tap-chi-my-thuat-web` shows a new deployment building/ready.
4. After it's ready, the article page shows the new sapo.
5. Revert the sapo and publish again; confirm the site updates back.

Report the actual observed statuses and timings to the user.

- [ ] **Step 5: Commit any deploy config changes**

```bash
git add -A apps
git commit -m "chore: deployment configuration for CMS and web"
```
(Skip if nothing changed.)

---

## Self-review notes

- Spec coverage: architecture (T1, T5, T9, T15) · content model incl. drafts, accent validation, slug, blocks, globals (T6) · webhook + debounce + error surfacing (T7; the admin "toast" in the spec is implemented as the read-only `rebuild-status` global, which persists the last result) · routes `/`, `/bai/[slug]`, `/muc-luc`, 404 (T11–T13) · design tokens/fonts/assets (T2, T9, T10) · seeding from PDF/PSD with Lorem kept (T2–T4, T8) · env fail-fast (T5 config `onInit`, T7 missing hook URL, T9 `CMS_URL`) · missing media renders without image (cards/hero conditionals, converters return '' when no URL) · tests: vitest (slug, rebuild, validate, title, cms client), pytest (text helpers, content shape), Playwright (T14).
- Items to flag to the user at the end: PDF email `tapchimythuat.gmail.com` lacks `@`; website `tapchimithuat.vn` vs `tapchimythuat` spelling mismatch; PDF typos kept verbatim.
