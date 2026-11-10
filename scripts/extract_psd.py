"""Export masthead, clouds, cover and sampled colors from bao2.psd.

Usage: py -3.14 -I scripts/extract_psd.py <psd_path> <out_dir>
"""
import json
import sys
from pathlib import Path

from PIL import Image
from psd_tools import PSDImage

MASTHEAD_LAYERS = {5, 12}  # 5 = TAP CHI + FINE ARTS + HOI line, 12 = "My thuat" with drum motif
CLOUD_TOP = 4  # layer 4 "Layer 3": top-left cloud
CLOUD_RIGHT = 8  # mid-right cloud
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
    # Ignore stray specks: keep the densest run of rows (gaps > 60 px split runs),
    # then crop columns to pixels inside that run.
    mask = canvas.getchannel("A").point(lambda a: 255 if a > 200 else 0)
    w, h = mask.size
    counts = [v * w // 255 for v in mask.resize((1, h), Image.BOX).getdata()]
    runs, start, last = [], None, None
    for y, c in enumerate(counts):
        if c >= 3:
            if start is None or y - last > 60:
                if start is not None:
                    runs.append((start, last))
                start = y
            last = y
    if start is not None:
        runs.append((start, last))
    bbox = None
    if runs:
        y0, y1 = max(runs, key=lambda r: sum(counts[r[0]:r[1] + 1]))
        band = mask.crop((0, y0, w, y1 + 1))
        bw = band.size[0]
        cols = [i for i, v in enumerate(band.resize((bw, 1), Image.BOX).getdata()) if v * (y1 + 1 - y0) >= 255 * 3]
        bbox = (cols[0], y0, cols[-1] + 1, y1 + 1)
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
    from collections import Counter
    maroon_px = Counter(p[:3] for p in masthead.getdata() if p[3] == 255 and p[0] > 3 * p[1] and p[0] < 140)
    maroon = "#%02X%02X%02X" % maroon_px.most_common(1)[0][0]
    colors = {
        "cream": sample(big, (2400, 40)),
        "maroon": maroon,  # most common dark-red opaque pixel (the M)
    }
    (out / "colors.json").write_text(json.dumps(colors, indent=2), encoding="utf-8")
    print("wrote", sorted(p.name for p in out.iterdir()), colors)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
