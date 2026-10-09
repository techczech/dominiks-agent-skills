"""Company logos for the widgets, read at build time from an icon library folder the user points to.

The folder holds svgl-format JSON (https://svgl.app: {"<key>": {"svg": "<svg ...>"}}), optionally extra.json
(same shape) and simple-icons.json ({"<slug>": {"body", "w", "h"}}). Brand marks belong to their owners.
Without an icons_dir (config.local.json "icons_dir" or --icons-dir) no logos are used: shapes and colours instead.

build(creator_names, icons_dir=None) -> {"symbols": "<svg>...</svg>" | "", "map": {creator: {"id", "disc"}}, "note": str | None}
Only logos for the creators passed in are embedded (inline <symbol>), so the widget stays self-contained.
Files read: svgl.json, extra.json (entries with "svg") and simple-icons.json (entries with "body","w","h").
Icons come in ONE variant (many svgl marks are white for dark surfaces), so white-only marks are recoloured dark and
every logo is drawn on a plain white tile (no ring). That reads in both colour schemes.
"""
import json
import os
import re

# AA creator name (lower-case) -> (library file, key). One small table.
CREATOR_ICON = {
    "anthropic": ("svgl", "anthropic"),
    "openai": ("svgl", "openai"),
    "google": ("svgl", "google"),
    "meta": ("svgl", "meta"),
    "spacexai": ("svgl", "xai"),
    "xai": ("svgl", "xai"),
    "deepseek": ("svgl", "deepseek"),
    "alibaba": ("svgl", "qwen"),
    "mistral": ("svgl", "mistral-ai"),
    "z ai": ("extra", "zai"),
    "kimi": ("svgl", "kimi"),
    "moonshot": ("svgl", "kimi"),
    "xiaomi": ("simple-icons", "xiaomi"),
    "nvidia": ("svgl", "nvidia"),
    "microsoft": ("svgl", "microsoft"),
    "microsoft ai": ("svgl", "microsoft"),
    "amazon": ("svgl", "amazon-web-services"),
    "ibm": ("svgl", "ibm"),
    "cohere": ("svgl", "cohere"),
    "perplexity": ("svgl", "perplexity-ai"),
    "minimax": ("simple-icons", "minimax"),
    "elevenlabs": ("extra", "elevenlabs"),
    "bytedance": ("simple-icons", "bytedance"),
}

_WHITE = re.compile(r'(?:fill|stop-color)\s*[=:]\s*"?\s*(?:#fff{1,2}f?f?|white)\b', re.I)
_BAD = re.compile(r'<\s*(?:script|image|foreignObject|style|a)\b|\bon\w+\s*=|href\s*=\s*"(?!#)|https?:', re.I)
_ROOT = re.compile(r"<svg\b([^>]*)>(.*)</svg>", re.S | re.I)
_KEEP_ATTRS = ("fill", "fill-rule", "clip-rule", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "opacity")


def _attr(attrs, name):
    m = re.search(r'(?<![\w:-])%s\s*=\s*"([^"]*)"' % re.escape(name), attrs)
    return m.group(1) if m else None


def _symbol(sym_id, svg):
    """Turn a full <svg> document into a namespaced <symbol>. Returns (symbol_html, disc) or None."""
    svg = re.sub(r"#ffff(?![0-9a-fA-F])", "#fff", svg.replace("currentColor", "#111"))
    white_re = re.compile(r'#fff(?:fff)?(?![0-9a-f])|(?<=["\':])white(?=["\';])', re.I)
    colours = {c.strip().lower() for c in re.findall(r'(?:fill|stop-color)\s*[=:]\s*"?([^";\s>]+)', svg)}
    colours -= {"none", "#111", "#000", "black", "transparent", "inherit"}
    colours = {c for c in colours if not white_re.fullmatch(c)}
    if not colours and white_re.search(svg):
        svg = white_re.sub("#111", svg)  # white-only mark: recolour dark so it reads on the white tile
    m = _ROOT.search(svg)
    if not m:
        return None
    attrs, inner = m.group(1), m.group(2)
    inner = re.sub(r"<title>.*?</title>", "", inner, flags=re.S | re.I)
    if _BAD.search(inner):
        return None
    vb = _attr(attrs, "viewBox")
    if not vb:
        w, h = _attr(attrs, "width"), _attr(attrs, "height")
        try:
            vb = "0 0 %g %g" % (float(re.sub(r"[^\d.]", "", w)), float(re.sub(r"[^\d.]", "", h)))
        except (TypeError, ValueError):
            return None
    for old in set(re.findall(r'\bid="([^"]+)"', inner)):
        new = "%s-%s" % (sym_id, old)
        inner = inner.replace('id="%s"' % old, 'id="%s"' % new)
        inner = inner.replace("url(#%s)" % old, "url(#%s)" % new)
        inner = inner.replace('href="#%s"' % old, 'href="#%s"' % new)
    rootattrs = " ".join('%s="%s"' % (k, _attr(attrs, k)) for k in _KEEP_ATTRS if _attr(attrs, k) is not None)
    disc = "light"  # every logo sits on a white tile; white-only marks were recoloured dark above
    return '<symbol id="%s" viewBox="%s"><g %s>%s</g></symbol>' % (sym_id, vb, rootattrs, inner.strip()), disc


def _load(icons_dir, lib, cache):
    if lib not in cache:
        try:
            with open(os.path.join(icons_dir, lib + ".json"), encoding="utf-8") as f:
                cache[lib] = json.load(f)
        except (OSError, ValueError):
            cache[lib] = None
    return cache[lib]


def build(creator_names, icons_dir=None):
    out = {"symbols": "", "map": {}, "note": None}
    if not icons_dir:
        out["note"] = "logos: no icons_dir configured (config.local.json or --icons-dir); using shapes and colours"
        return out
    if not os.path.isdir(icons_dir):
        out["note"] = "logos: icon library not found at %s; using shapes and colours instead" % icons_dir
        return out
    cache, symbols, done = {}, [], {}
    for name in creator_names:
        spec = CREATOR_ICON.get(name.lower())
        if not spec:
            continue
        lib, key = spec
        sym_id = "lg-" + re.sub(r"[^a-z0-9]+", "-", key.lower())
        if sym_id not in done:
            data = _load(icons_dir, lib, cache)
            entry = (data or {}).get(key)
            svg = None
            if isinstance(entry, dict):
                svg = entry.get("svg")
                if not svg and "body" in entry:
                    svg = '<svg viewBox="0 0 %s %s">%s</svg>' % (entry.get("w", 24), entry.get("h", 24), entry["body"])
            res = _symbol(sym_id, svg) if svg else None
            done[sym_id] = res
            if res:
                symbols.append(res[0])
        if done[sym_id]:
            out["map"][name] = {"id": sym_id, "disc": done[sym_id][1]}
    if symbols:
        out["symbols"] = ('<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">'
                          "<defs>%s</defs></svg>" % "".join(symbols))
    missing = [n for n in creator_names if n.lower() in CREATOR_ICON and n not in out["map"]]
    if missing:
        out["note"] = "logos: no usable icon for %s; shapes used" % ", ".join(missing)
    return out
