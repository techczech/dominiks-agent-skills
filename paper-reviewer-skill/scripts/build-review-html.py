#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "markdown>=3.7",
#   "pymdown-extensions>=10.9",
#   "PyYAML>=6.0",
# ]
# ///
"""
build-review-html.py — Render a paper review as a single self-contained HTML file.

Markdown stays the canonical source. This script builds a polished,
browser-openable HTML report that:

  - Renders the review's Markdown body with code highlighting and TOC
  - Pulls paper metadata + abstract from the matching 00-source.md
  - Embeds the abstract, the review YAML frontmatter, and (optionally) the
    extracted fulltext as in-page collapsible drawers
  - Embeds the source PDF as a base64 Blob-backed download link
  - Auto-generates a sidebar table of contents from H2/H3 headings
  - Ships a self-contained CSS+JS payload — no external fetches
  - Opens the result with `open` on macOS (--no-open to disable)

Patterns borrowed from the sibling single-html skill
(single-html/single-html-document/ in this repo),
in particular the page contract: sidebar TOC, no horizontal scroll,
print-readable, offline-safe, all assets inlined.

Usage:
  scripts/build-review-html.py papers/{folder}/reviews/{review}.md
  scripts/build-review-html.py {folder}             # picks newest review
  scripts/build-review-html.py --no-pdf {folder}    # skip embedding PDF
  scripts/build-review-html.py --no-fulltext {folder}
  scripts/build-review-html.py --out path.html {folder}
"""

from __future__ import annotations

import argparse
import base64
import datetime as dt
import html
import json
import mimetypes
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

import markdown
import yaml

_THIS = Path(__file__)
REPO_ROOT = (_THIS.parent.parent if _THIS.is_symlink() or _THIS.parent.is_symlink() else _THIS.resolve().parent.parent)
if not (REPO_ROOT / "papers").exists():
    REPO_ROOT = _THIS.resolve().parent.parent
# Allow override for host-repo invocations through a symlink
import os as _os
if _env := _os.environ.get("PAPER_REVIEWER_REPO_ROOT"):
    REPO_ROOT = Path(_env).resolve()
PAPERS = REPO_ROOT / "papers"


# ─────────────────────────────── argument resolution ───────────────────────────────

def resolve_review(arg: str) -> Path:
    """Accept a direct path to a review .md OR a paper folder slug/substring."""
    p = Path(arg)
    if p.is_file():
        return p.resolve()
    # Treat as folder slug under papers/
    candidates: list[Path] = []
    exact = PAPERS / arg
    if exact.is_dir():
        candidates.append(exact)
    else:
        candidates = [d for d in PAPERS.iterdir() if d.is_dir() and arg in d.name]
    if not candidates:
        sys.exit(f"error: no review file or paper folder matches {arg!r}")
    folder = candidates[0]
    reviews = sorted((folder / "reviews").glob("*.md"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not reviews:
        sys.exit(f"error: no reviews found in {folder}")
    if len(reviews) > 1:
        print(f"info: multiple reviews in {folder.name}; picking newest: {reviews[0].name}", file=sys.stderr)
    return reviews[0].resolve()


# ─────────────────────────────── parsing ───────────────────────────────

FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n(.*)$", re.DOTALL)


def parse_frontmatter(text: str) -> tuple[dict, str]:
    m = FRONTMATTER_RE.match(text)
    if not m:
        return {}, text
    try:
        meta = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError as e:
        print(f"warning: YAML parse error: {e}", file=sys.stderr)
        meta = {}
    return meta, m.group(2).lstrip("\n")


def find_paper_folder(review_path: Path) -> Path:
    """The paper folder is the parent-of-parent of a reviews/foo.md file.

    Always resolves to papers/{slug}/, since everything now lives under papers/.
    """
    p = review_path.parent
    if p.name == "reviews":
        return p.parent
    return p


def load_source_meta(paper_folder: Path) -> tuple[dict, str]:
    """Load 00-source-{slug}.md (new convention) with legacy fallback."""
    slug = paper_folder.name
    for c in (paper_folder / f"00-source-{slug}.md", paper_folder / "00-source.md"):
        if c.is_file():
            meta, body = parse_frontmatter(c.read_text(encoding="utf-8"))
            return meta, body
    return {}, ""


def find_pdf(paper_folder: Path) -> Path | None:
    slug = paper_folder.name
    for c in (paper_folder / f"00-source-{slug}.pdf", paper_folder / "00-source.pdf"):
        if c.is_file():
            return c
    for cand in paper_folder.glob("*.pdf"):
        return cand
    return None


def find_figures(paper_folder: Path) -> list[tuple[Path, dict, str]]:
    """Return list of (png_path, frontmatter, caption_text) for figures.

    Looks under papers/{slug}/figures/{slug}-figure-NN.{png,md}.
    """
    slug = paper_folder.name
    fig_dir = PAPERS / slug / "figures"
    if not fig_dir.is_dir():
        return []
    out: list[tuple[Path, dict, str]] = []
    for png in sorted(fig_dir.glob("*-figure-*.png")):
        md = png.with_suffix(".md")
        meta, _ = ({}, "")
        caption = ""
        if md.is_file():
            meta, _ = parse_frontmatter(md.read_text(encoding="utf-8"))
            caption = (meta.get("caption") or "").strip()
        out.append((png, meta or {}, caption))
    return out


def find_tables(paper_folder: Path) -> list[tuple[Path, Path | None, dict, str]]:
    """Return list of (csv_path, md_path, frontmatter, caption)."""
    tab_dir = paper_folder / "tables"
    if not tab_dir.is_dir():
        return []
    out = []
    for csv in sorted(tab_dir.glob("*-table-*.csv")):
        md = csv.with_suffix(".md")
        meta = {}
        caption = ""
        if md.is_file():
            meta, _ = parse_frontmatter(md.read_text(encoding="utf-8"))
            caption = (meta.get("caption") or "").strip()
        out.append((csv, md if md.is_file() else None, meta, caption))
    return out


def find_fulltext(paper_folder: Path) -> Path | None:
    slug = paper_folder.name
    candidates = [
        PAPERS / slug / f"{slug}-fulltext.md",
        paper_folder / f"{slug}-fulltext.md",
        PAPERS / slug / f"{slug}-fulltext.md",
    ]
    for c in candidates:
        if c.is_file():
            return c
    # fallback: any *fulltext.md
    for c in (PAPERS / slug).glob("*fulltext*.md"):
        return c
    return None


def find_pages(paper_folder: Path) -> list[Path]:
    """Return ordered list of page-thumbnail PNGs."""
    pdir = paper_folder / "pages"
    if not pdir.is_dir():
        return []
    return sorted(pdir.glob("*-page-*.png"))


# ─────────────────────────────── rendering ───────────────────────────────

def render_md(text: str) -> tuple[str, list[dict]]:
    """Render Markdown to HTML and return (html, toc_entries)."""
    md = markdown.Markdown(
        extensions=[
            "extra",  # tables, fenced code, etc.
            "sane_lists",
            "smarty",
            "toc",
            "pymdownx.tilde",
            "pymdownx.caret",
            "pymdownx.mark",
            "pymdownx.tasklist",
            "pymdownx.superfences",
            "pymdownx.magiclink",
            "pymdownx.smartsymbols",
        ],
        extension_configs={
            "toc": {"toc_depth": "2-3", "permalink": False},
            "pymdownx.tasklist": {"custom_checkbox": True},
        },
        output_format="html5",
    )
    html_body = md.convert(text)
    toc_tokens = getattr(md, "toc_tokens", []) or []
    return html_body, toc_tokens


def flatten_toc(tokens: list[dict], depth: int = 1, max_depth: int = 3) -> list[dict]:
    out = []
    for t in tokens:
        out.append({"level": depth, "id": t["id"], "name": t["name"]})
        if depth < max_depth and t.get("children"):
            out.extend(flatten_toc(t["children"], depth + 1, max_depth))
    return out


def format_authors(meta: dict) -> str:
    creators = meta.get("creators") or []
    if not creators:
        return meta.get("authors", "") or ""
    # entries are "Lastname, Firstname"
    names = []
    for c in creators:
        if isinstance(c, dict):
            ln = c.get("lastName") or c.get("last_name") or ""
            fn = c.get("firstName") or c.get("first_name") or ""
            full = f"{fn} {ln}".strip()
        else:
            parts = str(c).split(",", 1)
            full = f"{parts[1].strip()} {parts[0].strip()}" if len(parts) == 2 else str(c)
        if full:
            names.append(full)
    if not names:
        return ""
    if len(names) <= 3:
        return ", ".join(names[:-1]) + (" & " + names[-1] if len(names) > 1 else names[0])
    return f"{names[0]} et al."


def venue_string(meta: dict) -> str:
    venue = meta.get("publication_title") or meta.get("venue") or ""
    bits = [venue] if venue else []
    if meta.get("volume"):
        v = str(meta["volume"])
        if meta.get("issue"):
            v += f"({meta['issue']})"
        bits.append(v)
    if meta.get("pages"):
        bits.append(str(meta["pages"]))
    if meta.get("year") and not bits:
        bits.append(str(meta["year"]))
    return " · ".join(bits)


# ─────────────────────────────── HTML template ───────────────────────────────

CSS = r"""
:root{
  --bg:#f6f6f4; --panel:#ffffff; --ink:#1a1a1f; --muted:#5e5e68;
  --accent:#7a3b00; --accent-soft:#fff4e7;
  --warm:#b35a00; --cool:#2b6cb0;
  --line:#e3e0d8; --soft:#f0ece1;
  --code-bg:#f5f1e8; --shadow:0 1px 0 rgba(20,20,20,.04), 0 2px 12px rgba(20,20,20,.05);
  --maxw:760px;
}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--ink);overflow-x:clip}
body{
  font-family:Charter,"Iowan Old Style","Source Serif Pro",Georgia,serif;
  font-size:17px; line-height:1.62; -webkit-font-smoothing:antialiased;
}
.sans{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
a{color:var(--accent);text-decoration:none;border-bottom:1px solid rgba(122,59,0,.25)}
a:hover{border-bottom-color:var(--accent)}
h1,h2,h3,h4{font-family:Inter,-apple-system,sans-serif;line-height:1.25;margin-top:0}
h1{font-size:34px;letter-spacing:-.015em}
h2{font-size:24px;letter-spacing:-.01em;margin-top:2em;padding-top:.2em;border-top:1px solid var(--line)}
h3{font-size:18px;margin-top:1.5em}
code,kbd{font-family:"JetBrains Mono",ui-monospace,Menlo,monospace;font-size:.92em;background:var(--code-bg);padding:.08em .35em;border-radius:4px}
pre{background:var(--code-bg);padding:14px 16px;border-radius:8px;overflow-x:auto;line-height:1.5;font-size:14px}
pre code{background:transparent;padding:0}
blockquote{margin:1.2em 0;padding:.4em 1em;border-left:3px solid var(--accent);background:var(--accent-soft);color:#3a2400}
hr{border:none;height:1px;background:var(--line);margin:2.2em 0}
table{border-collapse:collapse;font-size:15px;margin:1em 0}
th,td{border-bottom:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top}
th{font-family:Inter,sans-serif;font-weight:700;background:var(--soft)}
ul,ol{padding-left:1.4em}
li{margin:.2em 0}
img{max-width:100%;height:auto;border-radius:6px}
:target{scroll-margin-top:1em;background:linear-gradient(90deg,var(--accent-soft) 0%,transparent 60%);border-radius:4px}

/* layout */
.shell{display:grid;grid-template-columns:260px minmax(0,1fr);gap:0;min-height:100vh}
aside.toc{
  position:sticky;top:0;height:100vh;overflow-y:auto;
  padding:24px 18px 24px 28px; background:transparent;
  border-right:1px solid var(--line); font-family:Inter,sans-serif;
}
aside.toc .toc-title{font-size:11px;font-weight:800;letter-spacing:.1em;color:var(--muted);text-transform:uppercase;margin-bottom:10px}
aside.toc a{display:block;padding:5px 8px;margin:1px 0;border-radius:6px;color:#3a3a40;border-bottom:none;font-size:14px;line-height:1.35}
aside.toc a:hover{background:var(--soft);color:var(--ink)}
aside.toc a.lv2{font-weight:600}
aside.toc a.lv3{padding-left:22px;font-size:13.5px;color:var(--muted)}
aside.toc a.active{background:var(--accent-soft);color:var(--accent);font-weight:600}
main.body{padding:0 max(28px,calc((100vw - 260px - var(--maxw))/2)) 80px;min-width:0}

/* header */
.header{padding:46px 0 28px;border-bottom:1px solid var(--line);margin-bottom:30px}
.header .eyebrow{font-family:Inter,sans-serif;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:14px}
.header h1{margin-bottom:14px;font-size:32px}
.header .authors{font-family:Inter,sans-serif;color:#2a2a30;font-size:16px;margin-bottom:4px}
.header .venue{font-family:Inter,sans-serif;color:var(--muted);font-size:14.5px}
.header .meta-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px;font-family:Inter,sans-serif;font-size:13px}
.tag{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;background:var(--soft);border-radius:99px;color:#444;border:1px solid var(--line);font-weight:500}
.tag.warm{background:var(--accent-soft);border-color:#f0d6b3;color:#6a3200}

/* abstract panel */
.abstract{margin:24px 0 36px;padding:18px 22px;background:var(--panel);border:1px solid var(--line);border-radius:10px;box-shadow:var(--shadow)}
.abstract h3{margin:0 0 8px;font-size:13px;font-weight:800;letter-spacing:.08em;color:var(--muted);text-transform:uppercase;font-family:Inter,sans-serif}
.abstract p{margin:0;color:#222;font-size:15.5px;line-height:1.6}

/* callout for relevance section etc */
.callout{padding:14px 18px;border:1px solid var(--line);border-left:4px solid var(--accent);background:#fffaf2;border-radius:8px;margin:1.2em 0}
.callout strong{color:var(--accent)}

/* figure gallery */
.figures-section{margin:34px 0}
.figures-section h2{border-top:none;margin-top:0}
.figure-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px;margin-top:14px}
.figure-card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px;box-shadow:var(--shadow);display:flex;flex-direction:column}
.figure-card img{display:block;width:100%;height:auto;border-radius:6px;cursor:zoom-in;background:#fff;border:1px solid var(--line)}
.figure-card .figure-label{margin-top:10px;font-family:Inter,sans-serif;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--accent)}
.figure-card .figure-caption{margin-top:5px;font-size:14px;color:#3a3a40;line-height:1.55}
.figure-modal{position:fixed;inset:0;background:rgba(20,20,20,.86);display:none;align-items:center;justify-content:center;z-index:100;padding:24px}
.figure-modal[data-open="true"]{display:flex}
.figure-modal img{max-width:95vw;max-height:90vh;border-radius:8px;box-shadow:0 10px 60px rgba(0,0,0,.4)}
.figure-modal .close{position:absolute;top:18px;right:24px;color:#fff;font-size:32px;cursor:pointer;font-family:Inter,sans-serif;line-height:1;background:none;border:0}

/* table rendering */
.tables-section table{font-size:13px}

/* downloads & drawers */
.action-bar{display:flex;flex-wrap:wrap;gap:10px;margin:24px 0 8px}
.button{display:inline-flex;align-items:center;gap:7px;padding:8px 14px;font-family:Inter,sans-serif;font-size:14px;font-weight:600;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--ink);cursor:pointer;box-shadow:var(--shadow);text-decoration:none}
.button:hover{background:var(--soft);border-bottom:1px solid var(--line)}
.button.primary{background:var(--accent);color:#fff;border-color:var(--accent)}
.button.primary:hover{background:#8e4500}
details.drawer{margin:18px 0;border:1px solid var(--line);border-radius:8px;background:var(--panel);box-shadow:var(--shadow)}
details.drawer>summary{padding:12px 16px;cursor:pointer;font-family:Inter,sans-serif;font-weight:700;color:#2a2a30;list-style:none;display:flex;align-items:center;justify-content:space-between;font-size:14px}
details.drawer>summary::-webkit-details-marker{display:none}
details.drawer>summary::after{content:"▾";color:var(--muted);transition:transform .15s ease}
details.drawer[open]>summary::after{transform:rotate(180deg)}
details.drawer>.drawer-body{padding:0 20px 18px;font-size:14.5px;color:#222;border-top:1px solid var(--line)}
details.drawer pre{background:#f8f5ec;font-size:12.5px;line-height:1.45;max-height:60vh;overflow:auto;border:1px solid #ece6d6}

/* footer */
.footer{margin-top:60px;padding:24px 0 0;border-top:1px solid var(--line);font-family:Inter,sans-serif;font-size:13px;color:var(--muted)}
.footer p{margin:4px 0}

@media (max-width:900px){
  .shell{grid-template-columns:1fr}
  aside.toc{position:static;height:auto;border-right:none;border-bottom:1px solid var(--line);padding:18px 20px}
  aside.toc a.lv3{display:none}
  main.body{padding:0 22px 60px}
}
@media print{
  aside.toc,.action-bar{display:none}
  body{background:#fff}
  .shell{grid-template-columns:1fr}
  main.body{padding:0 24px}
  details.drawer[open]>summary::after{display:none}
  details.drawer{border-color:#ccc;box-shadow:none}
  a{color:#000;border-bottom:none}
}
"""

JS = r"""
// IntersectionObserver-based TOC highlight
(function(){
  const links = Array.from(document.querySelectorAll('aside.toc a[data-section]'));
  if (!links.length) return;
  const map = new Map(links.map(l => [l.dataset.section, l]));
  const targets = links.map(l => document.getElementById(l.dataset.section)).filter(Boolean);
  if (!targets.length) return;
  const obs = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      const link = map.get(e.target.id);
      if (!link) return;
      if (e.isIntersecting){
        links.forEach(l=>l.classList.remove('active'));
        link.classList.add('active');
      }
    });
  }, {rootMargin:'-30% 0px -60% 0px', threshold:0});
  targets.forEach(t=>obs.observe(t));
})();

// Figure zoom modal
(function(){
  const modal = document.getElementById('figure-modal');
  if (!modal) return;
  const modalImg = modal.querySelector('img');
  document.querySelectorAll('.figure-card img').forEach(img=>{
    img.addEventListener('click', ()=>{
      modalImg.src = img.src;
      modalImg.alt = img.alt;
      modal.setAttribute('data-open','true');
    });
  });
  modal.addEventListener('click', ()=>{ modal.setAttribute('data-open','false'); });
  document.addEventListener('keydown', e=>{
    if (e.key === 'Escape') modal.setAttribute('data-open','false');
  });
})();

// Blob-backed PDF download (decoded lazily so the HTML stays small to ship)
(function(){
  const btn = document.querySelector('[data-pdf-download]');
  if (!btn) return;
  const dataEl = document.getElementById('pdf-payload');
  if (!dataEl) return;
  btn.addEventListener('click', (ev)=>{
    ev.preventDefault();
    const b64 = dataEl.textContent.replace(/\s+/g,'');
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], {type:'application/pdf'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = btn.dataset.pdfDownload || 'paper.pdf';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1500);
  });
})();
"""


def render_html(
    review_meta: dict,
    review_html: str,
    review_md_raw: str,
    toc_entries: list[dict],
    paper_meta: dict,
    fulltext_text: str | None,
    pdf_bytes: bytes | None,
    pdf_filename: str | None,
    source_repo_relpath: str,
    figures: list[tuple[Path, dict, str]] | None = None,
    tables: list[tuple[Path, Path | None, dict, str]] | None = None,
) -> str:
    figures = figures or []
    tables = tables or []
    title = (review_meta.get("paper_title") or paper_meta.get("title")
             or review_meta.get("title") or "Paper review")
    style = (review_meta.get("review_style") or "review").replace("_", " ")
    authors = format_authors(paper_meta)
    venue = venue_string(paper_meta)
    doi = paper_meta.get("doi") or ""
    url = paper_meta.get("url") or ""
    abstract = (paper_meta.get("abstract") or "").strip()
    reviewer = review_meta.get("reviewer") or ""
    reviewed_date = review_meta.get("reviewed_date") or ""
    tags = review_meta.get("tags") or []
    duration = review_meta.get("duration_minutes")

    # TOC HTML
    toc_html_parts = ['<div class="toc-title">On this page</div>']
    for entry in toc_entries:
        cls = f"lv{entry['level']+1}"  # lv2 for top, lv3 for children
        toc_html_parts.append(
            f'<a class="{cls}" data-section="{entry["id"]}" href="#{entry["id"]}">{html.escape(entry["name"])}</a>'
        )
    if figures:
        toc_html_parts.append(f'<a class="lv2" data-section="figures" href="#figures">Figures ({len(figures)})</a>')
    if tables:
        toc_html_parts.append(f'<a class="lv2" data-section="tables" href="#tables">Tables ({len(tables)})</a>')
    toc_html = "\n".join(toc_html_parts)

    # Header meta row
    meta_chips = []
    meta_chips.append(f'<span class="tag warm">📋 {html.escape(style)}</span>')
    if reviewed_date:
        meta_chips.append(f'<span class="tag">📅 {html.escape(str(reviewed_date)[:10])}</span>')
    if reviewer:
        meta_chips.append(f'<span class="tag">✍︎ {html.escape(reviewer)}</span>')
    if duration:
        meta_chips.append(f'<span class="tag">⏱ {duration} min</span>')
    for t in tags[:6]:
        meta_chips.append(f'<span class="tag">#{html.escape(str(t))}</span>')

    # Action bar
    actions = []
    if pdf_bytes is not None and pdf_filename:
        actions.append(
            f'<a class="button primary" href="#" data-pdf-download="{html.escape(pdf_filename)}">⤓ Download PDF</a>'
        )
    if doi:
        actions.append(f'<a class="button" href="https://doi.org/{html.escape(doi)}" target="_blank" rel="noopener">DOI ↗</a>')
    if url and url != f"https://doi.org/{doi}":
        actions.append(f'<a class="button" href="{html.escape(url)}" target="_blank" rel="noopener">Publisher page ↗</a>')
    actions.append(f'<a class="button" href="javascript:window.print()">🖨 Print</a>')

    # Figures: inline as base64 (so the file remains single-file shareable)
    figures_block = ""
    if figures:
        cards = []
        for i, (png, meta, caption) in enumerate(figures, start=1):
            b64 = base64.b64encode(png.read_bytes()).decode("ascii")
            mime = mimetypes.guess_type(png.name)[0] or "image/png"
            cap_html = html.escape(caption) if caption else '<em style="color:var(--muted)">(no caption captured)</em>'
            cards.append(f'''
<div class="figure-card" id="figure-{i:02d}">
  <img src="data:{mime};base64,{b64}" alt="Figure {i:02d}">
  <div class="figure-label">Figure {i:02d}</div>
  <div class="figure-caption">{cap_html}</div>
</div>''')
        figures_block = f'''
<section class="figures-section" id="figures">
  <h2>Figures from source paper ({len(figures)})</h2>
  <p class="sans" style="color:var(--muted);font-size:14px;margin-top:-6px">Click any figure to enlarge. Captions are parsed from the source PDF.</p>
  <div class="figure-grid">{''.join(cards)}</div>
</section>
<div class="figure-modal" id="figure-modal"><button class="close" aria-label="close">×</button><img alt=""></div>'''

    # Tables: render the inline markdown body if present
    tables_block = ""
    if tables:
        items = []
        for i, (csv, mdfile, meta, caption) in enumerate(tables, start=1):
            cap_html = html.escape(caption) if caption else '<em style="color:var(--muted)">(no caption captured)</em>'
            body_html = ""
            if mdfile and mdfile.is_file():
                txt = mdfile.read_text(encoding="utf-8")
                # Extract just the "## Data" section
                m = re.search(r"## Data\s*\n+(.*)$", txt, re.DOTALL)
                if m:
                    body_md = m.group(1).strip()
                    body_html, _ = render_md(body_md)
            items.append(f'''
<div class="figure-card" id="table-{i:02d}">
  <div class="figure-label">Table {i:02d}</div>
  <div class="figure-caption">{cap_html}</div>
  <div class="tables-section">{body_html or '<em style="color:var(--muted)">(See CSV file)</em>'}</div>
</div>''')
        tables_block = f'''
<section class="figures-section" id="tables">
  <h2>Tables from source paper ({len(tables)})</h2>
  <div class="figure-grid" style="grid-template-columns:1fr">{''.join(items)}</div>
</section>'''

    # Drawers
    drawers = []
    if abstract:
        drawers.append(f'''
<div class="abstract">
  <h3>Abstract (from source)</h3>
  <p>{html.escape(abstract)}</p>
</div>''')

    # Review frontmatter drawer
    fm_yaml = yaml.safe_dump(review_meta, sort_keys=False, allow_unicode=True, width=1000) if review_meta else ""
    if fm_yaml:
        drawers.append(f'''
<details class="drawer" id="drawer-frontmatter">
  <summary>Review metadata (YAML frontmatter)</summary>
  <div class="drawer-body"><pre><code>{html.escape(fm_yaml)}</code></pre></div>
</details>''')

    # Fulltext drawer (truncate to ~250 KB to keep size sane; user can open file from disk)
    if fulltext_text:
        truncated = fulltext_text[:300_000]
        marker = "" if len(fulltext_text) <= 300_000 else f"\n\n[…truncated at 300 KB; full text in repo]"
        drawers.append(f'''
<details class="drawer" id="drawer-fulltext">
  <summary>Source paper full text (pdftotext extract)</summary>
  <div class="drawer-body"><pre><code>{html.escape(truncated + marker)}</code></pre></div>
</details>''')

    # PDF payload (hidden, base64; lazy-decoded into a Blob by the JS above)
    pdf_payload_block = ""
    if pdf_bytes is not None:
        b64 = base64.b64encode(pdf_bytes).decode("ascii")
        pdf_payload_block = f'<script type="application/octet-stream" id="pdf-payload">{b64}</script>'

    # Footer info
    generated = dt.datetime.now().strftime("%Y-%m-%d %H:%M")
    footer = f'''
<div class="footer">
  <p>Generated {html.escape(generated)} from <code>{html.escape(source_repo_relpath)}</code>.</p>
  <p>Markdown remains the canonical source. This HTML is a delivery format — edit the .md file, then re-run <code>scripts/build-review-html.py</code>.</p>
</div>'''

    title_safe = html.escape(title)
    paper_year = paper_meta.get("year") or ""
    paper_year_str = f' · {html.escape(str(paper_year))}' if paper_year else ""
    venue_html = f' · <span>{html.escape(venue)}</span>' if venue else ""

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title_safe} — Review</title>
<style>{CSS}</style>
</head>
<body>
<div class="shell">
  <aside class="toc">{toc_html}</aside>
  <main class="body">
    <header class="header">
      <div class="eyebrow">{html.escape(style.title())} · Paper review</div>
      <h1>{title_safe}</h1>
      <div class="authors">{html.escape(authors)}{paper_year_str}</div>
      <div class="venue">{html.escape(venue)}{' · DOI ' + html.escape(doi) if doi else ''}</div>
      <div class="meta-row">{''.join(meta_chips)}</div>
      <div class="action-bar">{''.join(actions)}</div>
    </header>
    {''.join(drawers)}
    <article id="review-body">
{review_html}
    </article>
    {figures_block}
    {tables_block}
    {footer}
  </main>
</div>
{pdf_payload_block}
<script>{JS}</script>
</body>
</html>
"""


# ─────────────────────────────── main ───────────────────────────────

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("target", help="Path to a review .md OR a paper folder slug/substring.")
    ap.add_argument("--out", help="Output HTML path (default: alongside the review as .html).")
    ap.add_argument("--no-pdf", action="store_true", help="Do not embed the source PDF.")
    ap.add_argument("--no-fulltext", action="store_true", help="Do not embed the extracted fulltext.")
    ap.add_argument("--no-figures", action="store_true", help="Do not embed extracted figures or tables.")
    ap.add_argument("--no-open", action="store_true", help="Do not auto-open the result in the browser.")
    args = ap.parse_args()

    review_md_path = resolve_review(args.target)
    review_text = review_md_path.read_text(encoding="utf-8")
    review_meta, review_body_md = parse_frontmatter(review_text)

    paper_folder = find_paper_folder(review_md_path)
    paper_meta, _ = load_source_meta(paper_folder)

    review_body_html, toc_tokens = render_md(review_body_md)
    toc_entries = flatten_toc(toc_tokens)

    pdf_bytes = None
    pdf_filename = None
    if not args.no_pdf:
        pdf_path = find_pdf(paper_folder)
        if pdf_path:
            pdf_bytes = pdf_path.read_bytes()
            pdf_filename = pdf_path.name
            print(f"info: embedded PDF ({len(pdf_bytes)/1024:.0f} KB) from {pdf_path.relative_to(REPO_ROOT)}", file=sys.stderr)

    fulltext_text = None
    if not args.no_fulltext:
        ft = find_fulltext(paper_folder)
        if ft:
            fulltext_text = ft.read_text(encoding="utf-8")
            print(f"info: embedded fulltext ({len(fulltext_text)/1024:.0f} KB) from {ft.relative_to(REPO_ROOT)}", file=sys.stderr)

    figures = []
    tables = []
    if not args.no_figures:
        figures = find_figures(paper_folder)
        if figures:
            print(f"info: embedded {len(figures)} figures", file=sys.stderr)
        tables = find_tables(paper_folder)
        if tables:
            print(f"info: embedded {len(tables)} tables", file=sys.stderr)

    html_doc = render_html(
        review_meta=review_meta,
        review_html=review_body_html,
        review_md_raw=review_text,
        toc_entries=toc_entries,
        paper_meta=paper_meta,
        fulltext_text=fulltext_text,
        pdf_bytes=pdf_bytes,
        pdf_filename=pdf_filename,
        source_repo_relpath=str(review_md_path.relative_to(REPO_ROOT)),
        figures=figures,
        tables=tables,
    )

    out_path = Path(args.out).resolve() if args.out else review_md_path.with_suffix(".html")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(html_doc, encoding="utf-8")
    size_kb = out_path.stat().st_size / 1024
    print(f"✓ wrote {out_path.relative_to(REPO_ROOT) if str(out_path).startswith(str(REPO_ROOT)) else out_path} ({size_kb:.0f} KB)", file=sys.stderr)

    if not args.no_open:
        try:
            subprocess.run(["open", str(out_path)], check=False)
        except Exception as e:
            print(f"warning: could not auto-open: {e}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
