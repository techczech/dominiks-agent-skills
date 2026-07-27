#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["PyYAML>=6.0"]
# ///
"""
generate-dashboard.py — Render a single-HTML dashboard of all papers.

Reads index/papers.yaml and writes a self-contained HTML file with:
  - Stats banner (totals, status breakdown, review-style breakdown)
  - Search box (client-side filter across title / authors / collection / tags)
  - Status, collection, year, review-style filter chips
  - Sortable, sticky-header table of all papers
  - Each row: status pill, title (link), authors · year · venue, collection
    chips, review chips (linked), figure count, PDF + folder links
  - No external fetches; inline CSS + JS; opens from `file://`

Usage (from a host repo root):
  scripts/generate-dashboard.py                     # writes ./ai-paper-dashboard.html
  scripts/generate-dashboard.py --out path.html
  scripts/generate-dashboard.py --quiet             # no info output

Called automatically at the end of zotero-import.py and extract-paper-rich.py
when those scripts update index/papers.yaml.
"""

from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import sys
from pathlib import Path

import yaml

REPO_ROOT = Path.cwd()
DEFAULT_INDEX = REPO_ROOT / "index" / "papers.yaml"
DEFAULT_OUT = REPO_ROOT / "ai-paper-dashboard.html"


# ─────────────────────────────── data ───────────────────────────────

def load_papers(index_path: Path) -> list[dict]:
    with index_path.open(encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    raw = data.get("papers", {}) or {}
    out: list[dict] = []
    for key, paper in raw.items():
        if not isinstance(paper, dict):
            continue
        paper = dict(paper)
        paper["id"] = key
        # Normalise collections to a clean list (drop empty strings)
        cols = paper.get("collections") or []
        if isinstance(cols, str):
            cols = [cols]
        paper["collections"] = [c for c in cols if c]
        # Reviews: derive a short list of review types
        reviews = paper.get("reviews") or []
        paper["reviews"] = reviews if isinstance(reviews, list) else []
        paper["review_types"] = sorted({r.get("type", "?") for r in paper["reviews"] if isinstance(r, dict)})
        # Status default
        if not paper.get("status"):
            paper["status"] = "reviewed" if paper["reviews"] else "imported"
        out.append(paper)
    # Newest year first, then author
    out.sort(key=lambda p: (-(int(p.get("year") or 0)), str(p.get("authors") or "")))
    return out


def derive_stats(papers: list[dict]) -> dict:
    n = len(papers)
    reviewed = sum(1 for p in papers if p["reviews"])
    imported_only = n - reviewed
    n_figures = sum(1 for p in papers if (p.get("rich_extraction") or {}).get("figures", 0))
    style_counts: dict[str, int] = {}
    for p in papers:
        for s in p["review_types"]:
            style_counts[s] = style_counts.get(s, 0) + 1
    return {
        "total": n,
        "reviewed": reviewed,
        "imported_only": imported_only,
        "with_figures": n_figures,
        "review_styles": dict(sorted(style_counts.items(), key=lambda kv: -kv[1])),
    }


def collect_filters(papers: list[dict]) -> dict:
    statuses = sorted({p["status"] for p in papers})
    collections = sorted({c for p in papers for c in p["collections"]})
    years = sorted({int(p["year"]) for p in papers if str(p.get("year") or "").isdigit()}, reverse=True)
    styles = sorted({s for p in papers for s in p["review_types"]})
    return {"status": statuses, "collection": collections, "year": [str(y) for y in years], "style": styles}


# ─────────────────────────────── rendering ───────────────────────────────

CSS = r"""
:root{
  --bg:#f6f6f4; --panel:#ffffff; --ink:#1a1a1f; --muted:#5e5e68;
  --accent:#7a3b00; --accent-soft:#fff4e7;
  --line:#e3e0d8; --soft:#f0ece1;
  --pill-imported:#eceae3; --pill-reviewed:#fde6c8; --pill-completed:#cde7c8;
  --shadow:0 1px 0 rgba(20,20,20,.04), 0 2px 12px rgba(20,20,20,.05);
}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--ink);overflow-x:clip}
body{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px;line-height:1.45;-webkit-font-smoothing:antialiased}
a{color:var(--accent);text-decoration:none;border-bottom:1px solid rgba(122,59,0,.25)}
a:hover{border-bottom-color:var(--accent)}
h1,h2,h3{margin:0;font-weight:700;letter-spacing:-.01em}
header.shell{padding:30px max(28px,calc((100vw - 1240px)/2)) 14px;background:#fff;border-bottom:1px solid var(--line)}
header h1{font-family:Charter,"Iowan Old Style",Georgia,serif;font-size:30px;font-weight:600}
header .sub{color:var(--muted);font-size:13px;margin-top:4px}
.stats{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
.stat{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px 14px;min-width:120px;box-shadow:var(--shadow)}
.stat .n{font-size:22px;font-weight:700;line-height:1}
.stat .l{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-top:4px;font-weight:700}
.controls{position:sticky;top:0;background:rgba(246,246,244,.95);backdrop-filter:saturate(180%) blur(8px);z-index:10;padding:14px max(28px,calc((100vw - 1240px)/2));border-bottom:1px solid var(--line)}
.controls input[type=search]{width:100%;padding:9px 14px;border:1px solid var(--line);border-radius:8px;background:#fff;font:inherit;font-size:14px;outline-color:var(--accent)}
.chip-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;align-items:center}
.chip-row .label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-weight:700;margin-right:4px}
.chip{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;background:var(--panel);border:1px solid var(--line);border-radius:99px;font-size:12px;font-weight:500;color:#333;cursor:pointer;user-select:none}
.chip[data-active="true"]{background:var(--accent);color:#fff;border-color:var(--accent)}
.chip .cnt{opacity:.65;font-weight:400;margin-left:2px}

main.body{padding:18px max(28px,calc((100vw - 1240px)/2)) 60px}
table{width:100%;border-collapse:collapse;font-size:13.5px}
thead th{position:sticky;top:118px;background:#fbfbfa;border-bottom:1px solid var(--line);text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);padding:10px 12px;z-index:5}
tbody td{border-bottom:1px solid var(--line);padding:14px 12px;vertical-align:top}
tbody tr:hover{background:rgba(255,244,231,.4)}
tr.hidden{display:none}

.status{display:inline-block;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap}
.status.imported{background:var(--pill-imported);color:#4a4a52}
.status.reviewed{background:var(--pill-reviewed);color:#6a3200}
.status.completed{background:var(--pill-completed);color:#226022}

.title{font-weight:600;color:#222}
.title a{color:#222;border-bottom-color:rgba(20,20,20,.12)}
.title a:hover{color:var(--accent);border-bottom-color:var(--accent)}
.authors{color:var(--muted);font-size:12.5px;margin-top:3px}
.collections{margin-top:6px;display:flex;flex-wrap:wrap;gap:4px}
.col-chip{font-size:10.5px;color:#444;background:var(--soft);padding:2px 8px;border-radius:99px;font-weight:500}

.reviews{display:flex;flex-wrap:wrap;gap:4px;max-width:280px}
.r-tag{display:inline-block;font-size:11px;padding:2px 8px;border-radius:6px;background:var(--accent-soft);color:#6a3200;font-weight:600}
.r-tag.quick-read{background:#e8f5e9;color:#2a6f2a}
.r-tag.methods-deep-dive,.r-tag.methods-and-relevance{background:#e3f2fd;color:#1c4f7e}
.r-tag.gelman-review{background:#fff3e0;color:#8a4500}
.r-tag.critical-review{background:#fce4ec;color:#8a2a4a}
.r-tag.claims-audit-and-press{background:#f3e5f5;color:#6a1b9a}
.r-tag.summary-card{background:#ede7f6;color:#4a2e8a}
.r-empty{color:#bbb;font-size:11.5px}
.figs{font-variant-numeric:tabular-nums;color:#444;font-size:12.5px}
.figs.zero{color:#bbb}
.actions a{display:inline-block;font-size:11.5px;padding:3px 8px;border:1px solid var(--line);background:#fff;border-radius:6px;color:#333;border-bottom:1px solid var(--line);margin-right:3px;margin-bottom:3px}
.actions a:hover{border-color:var(--accent);color:var(--accent)}

.empty-row td{text-align:center;color:var(--muted);padding:40px 0}

footer{padding:24px max(28px,calc((100vw - 1240px)/2));color:var(--muted);font-size:12px;border-top:1px solid var(--line);margin-top:30px}
footer code{background:var(--soft);padding:1px 5px;border-radius:4px;font-size:11.5px}

@media (max-width:700px){
  thead{display:none}
  tbody td{display:block;border-bottom:none;padding:6px 0}
  tbody tr{display:block;border-bottom:1px solid var(--line);padding:14px 0}
  thead th{position:static}
}
@media print{
  .controls{position:static;background:#fff}
  a{color:#000;border:none}
}
"""

JS = r"""
(function(){
  const PAPERS = window.__PAPERS__;
  const FILTERS = {status:new Set(), collection:new Set(), year:new Set(), style:new Set()};
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  function matches(p, q){
    if (FILTERS.status.size && !FILTERS.status.has(p.status)) return false;
    if (FILTERS.collection.size && !p.collections.some(c => FILTERS.collection.has(c))) return false;
    if (FILTERS.year.size && !FILTERS.year.has(String(p.year || ''))) return false;
    if (FILTERS.style.size && !p.review_types.some(s => FILTERS.style.has(s))) return false;
    if (!q) return true;
    const hay = [
      p.title, p.authors, String(p.year || ''), p.venue || '',
      ...(p.collections || []), ...(p.review_types || []),
      ...(p.tags || [])
    ].join(' ').toLowerCase();
    return hay.includes(q);
  }

  function applyFilters(){
    const q = ($('#searchBox').value || '').trim().toLowerCase();
    let shown = 0;
    $$('tbody tr[data-id]').forEach(tr => {
      const p = PAPERS.find(x => x.id === tr.dataset.id);
      const visible = matches(p, q);
      tr.classList.toggle('hidden', !visible);
      if (visible) shown += 1;
    });
    $('#emptyRow').classList.toggle('hidden', shown !== 0);
    $('#shownCount').textContent = shown;
  }

  $('#searchBox').addEventListener('input', applyFilters);
  $$('.chip[data-dim]').forEach(chip => {
    chip.addEventListener('click', () => {
      const dim = chip.dataset.dim;
      const val = chip.dataset.value;
      if (FILTERS[dim].has(val)) FILTERS[dim].delete(val);
      else FILTERS[dim].add(val);
      chip.dataset.active = FILTERS[dim].has(val) ? 'true' : 'false';
      applyFilters();
    });
  });
  $('#clearFilters').addEventListener('click', () => {
    Object.values(FILTERS).forEach(s => s.clear());
    $$('.chip[data-dim]').forEach(c => c.dataset.active = 'false');
    $('#searchBox').value = '';
    applyFilters();
  });

  applyFilters();
})();
"""


def _venue(p: dict) -> str:
    parts = []
    if p.get("venue"):
        return str(p["venue"])
    if p.get("publication_title"):
        v = str(p["publication_title"])
        if p.get("volume"):
            v += f" {p['volume']}"
            if p.get("issue"):
                v += f"({p['issue']})"
        if p.get("pages"):
            v += f": {p['pages']}"
        parts.append(v)
    return " · ".join(parts)


def _short_authors(p: dict) -> str:
    a = (p.get("authors") or "").strip()
    return a or "(unknown)"


def render_row(p: dict) -> str:
    folder = p.get("folder_name") or ""
    path = (p.get("path") or "").rstrip("/")
    source_md = f"{path}/00-source-{folder}.md" if folder and path else ""
    pdf = f"{path}/00-source-{folder}.pdf" if folder and path else ""
    fulltext = f"{path}/{folder}-fulltext.md" if folder and path else ""

    rich = p.get("rich_extraction") or {}
    n_fig = int(rich.get("figures", 0))
    n_tab = int(rich.get("tables", 0))

    title = (p.get("title") or "").strip().strip("'\"")
    if not title:
        title = "(no title)"

    review_html_parts = []
    for r in p["reviews"]:
        if not isinstance(r, dict):
            continue
        t = r.get("type", "review")
        f = r.get("file", "")
        cls = "r-tag " + html.escape(t)
        if f:
            review_html_parts.append(f'<a class="{cls}" href="{html.escape(f)}">{html.escape(t)}</a>')
        else:
            review_html_parts.append(f'<span class="{cls}">{html.escape(t)}</span>')
    reviews_cell = "".join(review_html_parts) or '<span class="r-empty">none yet</span>'

    cols_cell = "".join(
        f'<span class="col-chip">{html.escape(c)}</span>' for c in p["collections"]
    ) or '<span class="r-empty">—</span>'

    actions = []
    if source_md:
        actions.append(f'<a href="{html.escape(source_md)}">source.md</a>')
    if fulltext:
        actions.append(f'<a href="{html.escape(fulltext)}">fulltext</a>')
    if pdf:
        actions.append(f'<a href="{html.escape(pdf)}">PDF</a>')
    if path:
        actions.append(f'<a href="{html.escape(path)}/">folder</a>')

    figs_cell = (
        f'<span class="figs">{n_fig} fig · {n_tab} tab</span>'
        if (n_fig or n_tab)
        else '<span class="figs zero">—</span>'
    )

    year = p.get("year") or ""
    venue = _venue(p)
    venue_html = f' · <em style="font-style:normal;color:#888">{html.escape(venue)}</em>' if venue else ""

    return f"""
<tr data-id="{html.escape(p['id'])}">
  <td><span class="status {html.escape(p['status'])}">{html.escape(p['status'])}</span></td>
  <td>
    <div class="title">{('<a href="'+html.escape(source_md)+'">'+html.escape(title)+'</a>') if source_md else html.escape(title)}</div>
    <div class="authors">{html.escape(_short_authors(p))} · {html.escape(str(year))}{venue_html}</div>
    <div class="collections">{cols_cell}</div>
  </td>
  <td><div class="reviews">{reviews_cell}</div></td>
  <td>{figs_cell}</td>
  <td class="actions">{''.join(actions)}</td>
</tr>"""


def render_chip(dim: str, value: str, count: int) -> str:
    return (
        f'<span class="chip" data-dim="{dim}" data-value="{html.escape(value)}" data-active="false">'
        f'{html.escape(value or "—")}<span class="cnt"> · {count}</span>'
        f'</span>'
    )


def render_chip_row(label: str, dim: str, values: list[str], papers: list[dict], key_fn) -> str:
    counts: dict[str, int] = {}
    for p in papers:
        for v in key_fn(p):
            counts[v] = counts.get(v, 0) + 1
    chips = "".join(render_chip(dim, v, counts.get(v, 0)) for v in values if v)
    if not chips:
        return ""
    return f'<div class="chip-row"><span class="label">{html.escape(label)}</span>{chips}</div>'


def render_dashboard(papers: list[dict], stats: dict, filters: dict) -> str:
    rows = "\n".join(render_row(p) for p in papers)
    chip_rows = "".join([
        render_chip_row("Status", "status", filters["status"], papers, lambda p: [p["status"]]),
        render_chip_row("Collection", "collection", filters["collection"], papers, lambda p: p["collections"]),
        render_chip_row("Year", "year", filters["year"], papers, lambda p: [str(p.get("year") or "")]),
        render_chip_row("Review style", "style", filters["style"], papers, lambda p: p["review_types"]),
    ])

    safe_payload = [{
        "id": p["id"],
        "title": p.get("title", ""),
        "authors": p.get("authors", ""),
        "year": p.get("year", ""),
        "venue": _venue(p),
        "collections": p.get("collections") or [],
        "review_types": p.get("review_types") or [],
        "status": p.get("status", "imported"),
        "tags": p.get("tags") or [],
    } for p in papers]
    payload = json.dumps(safe_payload, ensure_ascii=False, default=str)

    style_lines = "".join(
        f'<span class="r-tag {s}">{html.escape(s)}</span> <span style="color:var(--muted);font-size:12px">×{n}</span> &nbsp; '
        for s, n in stats["review_styles"].items()
    )
    style_block = (
        f'<div style="margin-top:14px;font-size:12.5px;color:#444">{style_lines}</div>'
        if style_lines else ""
    )

    generated = dt.datetime.now().strftime("%Y-%m-%d %H:%M")

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AI Paper Dashboard</title>
<style>{CSS}</style>
</head>
<body>
<header class="shell">
  <h1>AI Paper Dashboard</h1>
  <div class="sub">Generated {html.escape(generated)} from <code>index/papers.yaml</code> — {stats['total']} papers.</div>
  <div class="stats">
    <div class="stat"><div class="n">{stats['total']}</div><div class="l">Total</div></div>
    <div class="stat"><div class="n">{stats['reviewed']}</div><div class="l">Reviewed</div></div>
    <div class="stat"><div class="n">{stats['imported_only']}</div><div class="l">Imported only</div></div>
    <div class="stat"><div class="n">{stats['with_figures']}</div><div class="l">With figures</div></div>
  </div>
  {style_block}
</header>
<div class="controls">
  <input id="searchBox" type="search" placeholder="Search title, authors, collection, tags…">
  {chip_rows}
  <div class="chip-row">
    <span class="label">Showing <span id="shownCount">{len(papers)}</span> / {len(papers)}</span>
    <span class="chip" id="clearFilters" style="margin-left:auto;background:#fff">Clear filters</span>
  </div>
</div>
<main class="body">
<table>
<thead>
<tr><th style="width:110px">Status</th><th>Paper</th><th style="width:300px">Reviews</th><th style="width:110px">Extracts</th><th style="width:240px">Actions</th></tr>
</thead>
<tbody>
{rows}
<tr id="emptyRow" class="empty-row hidden"><td colspan="5">No papers match the current filters.</td></tr>
</tbody>
</table>
</main>
<footer>
Single-file dashboard generated by <code>scripts/generate-dashboard.py</code> (from the <code>paper-reviewer-skill</code>).
Re-runs automatically when <code>zotero-import.py</code> or <code>extract-paper-rich.py</code> updates <code>index/papers.yaml</code>; or invoke manually.
</footer>
<script>window.__PAPERS__ = {payload};</script>
<script>{JS}</script>
</body>
</html>
"""


# ─────────────────────────────── main ───────────────────────────────

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--index", type=Path, default=DEFAULT_INDEX, help="Path to papers.yaml")
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT, help="Output HTML path")
    ap.add_argument("--quiet", action="store_true", help="Suppress info output")
    args = ap.parse_args()

    if not args.index.is_file():
        print(f"error: {args.index} not found", file=sys.stderr)
        return 1

    papers = load_papers(args.index)
    stats = derive_stats(papers)
    filters = collect_filters(papers)
    html_doc = render_dashboard(papers, stats, filters)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(html_doc, encoding="utf-8")

    if not args.quiet:
        size_kb = args.out.stat().st_size / 1024
        try:
            rel = args.out.relative_to(Path.cwd())
        except ValueError:
            rel = args.out
        print(
            f"✓ wrote {rel} ({size_kb:.0f} KB): "
            f"{stats['total']} papers, {stats['reviewed']} reviewed, "
            f"{stats['with_figures']} with figures"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
