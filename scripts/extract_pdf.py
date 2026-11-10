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
    # 14pt Roman is the intro paragraph that carries the drop cap on some pages
    if font.endswith("PalatinoLinotype-Roman") and (10.5 <= size <= 11.5 or 13.5 <= size <= 14.5):
        return "body"
    return None


def reading_order(blocks):
    # columns: group by x0 bucket (50pt), then top-to-bottom. Use the first line's
    # origin, not the block bbox: some frames carry hidden overflow text that
    # stretches the bbox far left/down (e.g. page 11).
    def key(b):
        x0, y0 = b["lines"][0]["bbox"][:2]
        return (round(x0 / 50), y0)
    return sorted(blocks, key=key)


TERMINAL = (".", "!", "?", "…", '"', "”", ":")


HEADING_PREFIX = "## "


def assemble_page(items):
    """items: [(text, bucket, n_lines, col_first)] for ONE page in reading order;
    returns paragraph strings, subheadings prefixed with "## ".

    Heading: a short (<= 2 lines, < 70 chars), unpunctuated, isolated block. It is
    NOT a heading (stays body) when it is the tail of a truncated frame, i.e. the
    previous block in the same column has no terminal punctuation, or when the next
    block continues it across a column break.
    Continuation: a column-top block that starts lowercase continues the previous
    body block if that has no terminal punctuation. Headings never merge, blocks
    that are not at a column top (frame restarts) never merge, nothing crosses a page."""
    def continues(prev_text, nxt):
        return nxt[3] and nxt[0][:1].islower() and not prev_text.rstrip().endswith(TERMINAL)

    heading = []
    for i, (text, bucket, n_lines, _cf) in enumerate(items):
        short = n_lines <= 2 and len(text) < 70 and not text.rstrip().endswith(TERMINAL)
        tail_of_frame = i > 0 and items[i - 1][1] == bucket and not items[i - 1][0].rstrip().endswith(TERMINAL)
        continued_next = i + 1 < len(items) and continues(text, items[i + 1])
        heading.append(short and not tail_of_frame and not continued_next)

    out, out_is_heading = [], []
    for i, item in enumerate(items):
        text = item[0]
        if heading[i]:
            out.append(HEADING_PREFIX + text)
            out_is_heading.append(True)
        elif out and not out_is_heading[-1] and continues(out[-1], item):
            out[-1] = out[-1].rstrip() + " " + text
        else:
            out.append(text)
            out_is_heading.append(False)
    return out


def resolve_dropcaps(dropcaps, ordered, page_no):
    """dropcaps: drop-cap blocks of a page; ordered: body blocks in reading order.
    Returns {body index: letter}; raises if a drop cap has no body block beside it."""
    caps = {}
    for dc in dropcaps:
        idx = dropcap_target(dc, ordered)
        if idx is None:  # never silently lose the letter
            raise ValueError(f"page {page_no}: drop cap {block_text(dc).strip()!r} has no body block beside it")
        caps[idx] = block_text(dc).strip()
    return caps


def dropcap_target(dc_block, blocks):
    """Index of the first body block sitting beside the drop cap."""
    dx0, dy0, _, dy1 = dc_block["bbox"]
    for i, b in enumerate(blocks):
        bx0, by0 = b["lines"][0]["bbox"][:2]
        if abs(bx0 - dx0) < 20 and dy0 - 5 <= by0 <= dy1:
            return i
    return None


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
    paragraphs, lead, seen = [], None, set()
    for pn in meta["pages"]:
        page = doc[pn - 1]
        blocks = [b for b in page.get_text("dict")["blocks"] if b["type"] == 0]
        typed = [(classify(b, page.rect.height), b) for b in blocks]
        for kind, b in typed:
            if kind == "lead" and lead is None:
                lead = clean_block(block_text(b))
        ordered = reading_order([b for k, b in typed if k == "body"])
        caps = resolve_dropcaps([dc for k, dc in typed if k == "dropcap"], ordered, pn)
        items, prev_bucket = [], None
        for i, b in enumerate(ordered):
            text = clean_block(block_text(b))
            bucket = round(b["lines"][0]["bbox"][0] / 50)
            prev_bucket, was_bucket = bucket, prev_bucket
            if not text:
                continue
            # The print layout re-pastes the same filler at the top of many frames;
            # a block whose opening was already seen in this article is a restart,
            # not the continuation of the previous column.
            key = text[:30]
            col_first = bucket != was_bucket and key not in seen
            seen.add(key)
            if i in caps:
                text = apply_drop_cap(text, caps[i])
            items.append((text, bucket, len(b["lines"]), col_first))
        paragraphs.extend(assemble_page(items))
    images, hero = extract_images(doc, meta["pages"], img_dir, meta["slug"])
    body = [p for p in paragraphs if not p.startswith(HEADING_PREFIX)]
    body_is_lorem = bool(body) and is_lorem(body[0])
    return {
        "slug": meta["slug"], "title": meta["title"], "titleAccent": meta["titleAccent"],
        "page": meta["pages"][0], "featured": meta["featured"],
        "sapo": lead or meta["tocBlurb"], "tocBlurb": meta["tocBlurb"],
        "heroImage": hero, "images": images, "paragraphs": paragraphs,
        # lead is already used as sapo; do not duplicate it as pullQuote
        "pullQuote": None, "isLorem": body_is_lorem,
    }


def extract_foreword(doc):
    page = doc[0]
    paras, signature = [], "Trân trọng!"
    # The foreword frame bleeds past the page edge (x1 ~607 > 595); the default
    # mediabox clip drops the last glyphs of each line, so widen the clip.
    wide = fitz.Rect(-50, -50, page.rect.width + 100, page.rect.height + 100)
    for b in page.get_text("dict", clip=wide, flags=fitz.TEXT_PRESERVE_WHITESPACE | fitz.TEXT_PRESERVE_LIGATURES)["blocks"]:
        if b["type"] != 0:
            continue
        sp = spans(b)
        if not sp or b["bbox"][0] < 400:
            continue
        text = clean_block(block_text(b))
        if sp[0]["font"].endswith("PalatinoLinotype-Roman") and sp[0]["size"] < 12 and "Mỹ Thuật" not in text:
            # a short line (< 60% of the widest) ends a paragraph
            widest = max(l["bbox"][2] - l["bbox"][0] for l in b["lines"])
            cur = []
            for line in b["lines"]:
                cur.append("".join(x["text"] for x in line["spans"]))
                if line["bbox"][2] - line["bbox"][0] < 0.6 * widest:
                    paras.append(clean_block("\n".join(cur)))
                    cur = []
            if cur:
                paras.append(clean_block("\n".join(cur)))
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
