#!/usr/bin/env python3
"""Build a rebuild-spec from reference/original.html using lxml.

Per <section>, walk the DOM in document order and emit nodes for:
- headings (with data-ux + data-typography)
- rich text blocks (data-ux Text/ContentText/...) keeping inner HTML
- images (resolve lazy src via srcset/data-srcset, keep base isteam path + alt)
- links wrapping content, iframes, FAQ q/a pairs, buttons with text
"""
import json
import re
from pathlib import Path
from urllib.parse import unquote

from lxml import html as lhtml

ROOT = Path(__file__).resolve().parent.parent
doc = lhtml.fromstring((ROOT / "reference" / "original.html").read_text(encoding="utf-8"))

TEXT_UX = {"Text", "ContentText", "ContentCardText", "Details", "IntroText",
           "Caption", "TextMinor", "TaglineExtra"}


def img_src(el):
    """Resolve the real isteam base path of an <img> (may be lazy)."""
    cands = []
    for attr in ("src", "data-src", "srcset", "data-srcset", "data-lazyimg-srcset"):
        v = el.get(attr) or ""
        cands += re.findall(r"//img1\.wsimg\.com/isteam/[^\s,\"']+", v)
    for u in cands:
        base = u.split("/:/")[0]
        if "transparent_placeholder" not in base:
            return unquote(base.rsplit("/", 1)[-1])
    return None


def rich_html(el):
    """Inner HTML with class/data attrs stripped, whitespace squeezed."""
    inner = (el.text or "") + "".join(
        lhtml.tostring(c, encoding="unicode") for c in el)
    inner = re.sub(r'\s(?:class|style|data-[\w-]+|id)="[^"]*"', "", inner)
    return re.sub(r"\s+", " ", inner).strip()


def txt(el):
    return re.sub(r"\s+", " ", el.text_content()).strip()


sections = []
for n, sec in enumerate(doc.iter("section")):
    nodes = []
    # hold real references: lxml proxies are GC'd and id() addresses reused,
    # so a plain id() set gives false positives
    seen = []
    for el in sec.iter():
        if any(a is s for a in el.iterancestors() for s in seen):
            continue
        ux = el.get("data-ux") or ""
        aid = el.get("data-aid") or ""
        tag = el.tag
        node = None
        if tag == "img":
            s = img_src(el)
            if s:
                node = {"t": "img", "src": s, "alt": el.get("alt", "")}
        elif tag == "iframe":
            src = el.get("src", "")
            if src.startswith("http"):
                node = {"t": "iframe", "src": src}
        elif tag in ("h1", "h2", "h3", "h4", "h5") or ux in (
                "SectionHeading", "HeadingProduct", "ContentCardHeading",
                "ContentHeading", "HeadingMajor", "HeadingMinor", "Tagline"):
            t = txt(el)
            if t:
                node = {"t": "h", "tag": tag if isinstance(tag, str) else "div",
                        "ux": ux, "aid": aid, "text": t}
                seen.append(el)
        elif ux in TEXT_UX:
            t = rich_html(el)
            if t:
                node = {"t": "rich", "ux": ux, "aid": aid, "html": t}
                seen.append(el)
        elif tag == "a":
            href = el.get("href", "")
            if href and not href.startswith("#"):
                imgs = [s for s in (img_src(i) for i in el.iter("img")) if s]
                node = {"t": "a", "href": href, "ux": ux, "text": txt(el)[:120]}
                if imgs:
                    node["imgs"] = imgs
                seen.append(el)
        elif tag == "button":
            t = txt(el)
            node = {"t": "btn", "ux": ux, "aid": aid, "text": t[:120]}
            seen.append(el)
        elif tag in ("input", "textarea"):
            node = {"t": "field", "tag": tag,
                    "label": el.get("aria-label") or el.get("placeholder") or "",
                    "type": el.get("type", "")}
        if node:
            node["aid"] = aid
            nodes.append(node)
    sections.append({"n": n, "nodes": nodes})

dest = ROOT / "reference" / "spec.json"
dest.write_text(json.dumps(sections, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"-> {dest}")
for s in sections:
    kinds = {}
    for nd in s["nodes"]:
        kinds[nd["t"]] = kinds.get(nd["t"], 0) + 1
    print(f"[{s['n']:2}] {len(s['nodes']):3} nodes  {kinds}")
