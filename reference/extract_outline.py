#!/usr/bin/env python3
"""Walk reference/original.html and dump an ordered outline per <section>:
headings, paragraphs, images (base name), links, iframes. Output is the
content spec used to rebuild the page."""
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parent.parent
HTML = (ROOT / "reference" / "original.html").read_text(encoding="utf-8")

TEXT_UX = {"SectionHeading", "Heading", "Text", "Subheading", "HeadingMinor",
           "TextMinor", "Tagline", "TaglineMain", "IntroText", "Caption",
           "ContentHeading", "ContentText", "List", "ListItem", "Quote",
           "PromotionBanner", "Details", "DetailsHeading"}


class Outline(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.sections = []
        self.cur = None
        self.stack = []          # (tag, ux or None, capture_text_list or None)
        self.depth = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        ux = a.get("data-ux")
        if tag == "section":
            self.cur = {"id": a.get("id", ""), "items": []}
            self.sections.append(self.cur)
        if self.cur is None:
            self.stack.append((tag, None, None))
            return
        items = self.cur["items"]
        cap = None
        if tag == "img":
            src = a.get("src", "")
            base = unquote(src.split("/:/")[0].rsplit("/", 1)[-1]) if "isteam" in src else src
            items.append({"t": "img", "src": base, "alt": a.get("alt", "")})
        elif tag == "iframe":
            items.append({"t": "iframe", "src": a.get("src", "")})
        elif tag == "a":
            cap = []
            items.append({"t": "a", "href": a.get("href", ""), "ux": ux, "text": cap})
        elif tag in ("h1", "h2", "h3", "h4", "h5"):
            cap = []
            items.append({"t": tag, "ux": ux, "text": cap})
        elif ux in TEXT_UX:
            cap = []
            items.append({"t": "ux", "ux": ux, "text": cap})
        elif tag in ("input", "textarea", "select", "button"):
            items.append({"t": "form:" + tag, "ux": ux,
                          "label": a.get("aria-label") or a.get("placeholder") or ""})
        self.stack.append((tag, ux, cap))

    def handle_endtag(self, tag):
        while self.stack:
            t, ux, cap = self.stack.pop()
            if t == tag:
                break

    def handle_data(self, data):
        d = data.strip()
        if not d:
            return
        for t, ux, cap in reversed(self.stack):
            if cap is not None:
                cap.append(d)
                return


p = Outline()
p.feed(HTML)

out = []
for i, s in enumerate(p.sections):
    sec = {"n": i, "id": s["id"], "items": []}
    for it in s["items"]:
        if "text" in it:
            it["text"] = " ".join(it["text"])
            if not it["text"] and it["t"] not in ("a",):
                continue
        sec["items"].append(it)
    out.append(sec)

dest = ROOT / "reference" / "outline.json"
dest.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"{len(out)} sections -> {dest}")
for s in out:
    heads = [i["text"][:40] for i in s["items"] if i["t"] in ("h1", "h2", "h3")][:2]
    print(f"  [{s['n']}] id={s['id'][:20]:20} items={len(s['items']):3}  {' | '.join(heads)}")
