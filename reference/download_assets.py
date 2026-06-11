#!/usr/bin/env python3
"""Download all image/font/favicon assets referenced by reference/original.html.

For each isteam image, GoDaddy serves crop+resize variants
(/:/cr=.../rs=w:NNN). We keep the crop transform (it defines the visible
framing) and download the widest variant so the local copy matches the
original look at full resolution.
"""
import html as htmllib
import re
import subprocess
import sys
import unicodedata
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parent.parent
HTML = (ROOT / "reference" / "original.html").read_text(encoding="utf-8")
IMG_DIR = ROOT / "public" / "images"
FONT_DIR = ROOT / "public" / "fonts"

# --- collect isteam image URLs, grouped by base image ---
urls = set(re.findall(r"//img1\.wsimg\.com/isteam/[^\"'\s)]+", htmllib.unescape(HTML)))
groups: dict[str, list[str]] = {}
for u in urls:
    base = u.split("/:/")[0]
    groups.setdefault(base, []).append(u)


def width_of(u: str) -> int:
    m = re.search(r"rs=w:(\d+)", u)
    return int(m.group(1)) if m else 0


def slugify(name: str) -> str:
    name = unquote(name)
    stem, dot, ext = name.rpartition(".")
    if not dot:
        stem, ext = name, "png"
    # keep CJK + ascii alnum, turn the rest into '-'
    out = []
    for ch in stem:
        if ch.isalnum():
            out.append(ch.lower())
        else:
            out.append("-")
    slug = re.sub(r"-+", "-", "".join(out)).strip("-")
    return f"{slug}.{ext.lower()}"


manifest = []
for base, variants in sorted(groups.items()):
    name = base.rsplit("/", 1)[-1]
    if "transparent_placeholder" in base:
        continue
    if "/getty/" in base:
        fname = f"getty-{name}.jpg"
    else:
        fname = slugify(name)
    best = max(variants, key=width_of)
    # also fetch the un-resized cropped original when crop exists
    crop = re.search(r"/:/(cr=[^/]+)", best)
    src = f"{base}/:/{crop.group(1)}" if crop else base
    if width_of(best) > 0:
        src = best  # widest rendered variant is what the page actually shows
    url = "https:" + src
    dest = IMG_DIR / fname
    print(f"IMG {fname} <- {url[:120]}")
    r = subprocess.run(["curl", "-sfL", "-o", str(dest), url])
    if r.returncode != 0:
        print(f"  !! FAILED {url}", file=sys.stderr)
        continue
    manifest.append((fname, "https:" + base, src))

# --- fonts ---
font_urls = sorted(set(re.findall(r"//img1\.wsimg\.com/gfonts/[^\"'\s)]+\.woff2", HTML)))
for fu in font_urls:
    fname = fu.rsplit("/", 1)[-1]
    family = fu.split("/gfonts/s/")[1].split("/")[0]
    dest = FONT_DIR / f"{family}-{fname}"
    print(f"FONT {dest.name}")
    subprocess.run(["curl", "-sfL", "-o", str(dest), "https:" + fu], check=False)

# --- favicon ---
fav = re.search(r'shortcut icon" href="(//img1\.wsimg\.com/[^"]+\.ico)"', HTML)
if fav:
    subprocess.run(
        ["curl", "-sfL", "-o", str(ROOT / "public" / "favicon.ico"), "https:" + fav.group(1)],
        check=False,
    )
    print("FAVICON favicon.ico")

(ROOT / "reference" / "image_manifest.txt").write_text(
    "\n".join(f"{f}\t{b}\t{s}" for f, b, s in manifest), encoding="utf-8"
)
print(f"\nDone: {len(manifest)} images, {len(font_urls)} fonts")
