#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "PyYAML>=6.0",
# ]
# ///
"""
extract-paper-rich.py — Rich, layout-aware paper extraction.

Wraps the academic-pdf-to-mkd skill (Docling / MinerU / pymupdf4llm) and
places the output in this repo's canonical folder layout with our
fully-qualified-filename convention.

Output layout (all files prefixed by the paper folder name):

  papers/{folder}/00-source-{folder}.pdf            (untouched if present)
  papers/{folder}/00-source-{folder}.md             (preserved)
  papers/{folder}/{folder}-fulltext.md              (REPLACED with Docling output)
  papers/{folder}/figures/{folder}-figure-NN.png
  papers/{folder}/figures/{folder}-figure-NN.md   (metadata + caption)
  papers/{folder}/tables/{folder}-table-NN.csv
  papers/{folder}/tables/{folder}-table-NN.md     (metadata + caption)
  papers/{folder}/pages/{folder}-page-NNN.png

Also enriches figure/table caption metadata by scanning the fulltext for
"Fig. N |" / "Table N." markers (Docling sometimes returns empty captions).

Usage:
  scripts/extract-paper-rich.py {paper-folder-slug-or-substring}
  scripts/extract-paper-rich.py --engine docling {slug}
  scripts/extract-paper-rich.py --engine fast {slug}     # for arXiv-style preprints
  scripts/extract-paper-rich.py --engine math {slug}     # heavy math
  scripts/extract-paper-rich.py --keep-temp {slug}       # don't delete temp dir

Prerequisites:
  - academic-pdf-to-mkd skill cloned and `uv sync`-ed as a sibling of this
    skill folder (or point the ACADEMIC_PDF_SKILL env var at it).
  - First run downloads ~15 MB of OCR models the first time docling needs them.
"""

from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
PAPERS = REPO_ROOT / "papers"
INDEX_FILE = REPO_ROOT / "index" / "papers.yaml"
ACADEMIC_PDF_SKILL = Path(
    os.environ.get(
        "ACADEMIC_PDF_SKILL",
        Path(__file__).resolve().parents[2] / "academic-pdf-to-mkd",
    )
)
EXTRACT_SH = ACADEMIC_PDF_SKILL / "scripts" / "extract-pdf.sh"


# ─────────────────────────────── helpers ───────────────────────────────

def resolve_paper_folder(arg: str) -> Path:
    """Accept exact folder name or fuzzy substring."""
    p = PAPERS / arg
    if p.is_dir():
        return p.resolve()
    matches = [d for d in PAPERS.iterdir() if d.is_dir() and arg in d.name]
    if not matches:
        sys.exit(f"error: no paper folder matches {arg!r} under {PAPERS}")
    if len(matches) > 1:
        print(f"warning: multiple folder matches; using {matches[0].name}", file=sys.stderr)
        for m in matches[1:]:
            print(f"  also matched: {m.name}", file=sys.stderr)
    return matches[0].resolve()


def find_source_pdf(folder: Path) -> Path:
    """Locate the source PDF, supporting both old (00-source.pdf) and new (00-source-{folder}.pdf) names."""
    candidates = [
        folder / f"00-source-{folder.name}.pdf",
        folder / "00-source.pdf",
    ]
    # Any other PDF in the folder
    candidates.extend(sorted(folder.glob("*.pdf")))
    for c in candidates:
        if c.is_file():
            return c
    sys.exit(f"error: no PDF found in {folder}")


def run_extractor(pdf: Path, out_dir: Path, engine: str) -> None:
    if not EXTRACT_SH.is_file():
        sys.exit(f"error: academic-pdf-to-mkd extract-pdf.sh not found at {EXTRACT_SH}")
    cmd = ["bash", str(EXTRACT_SH), str(pdf), str(out_dir), "--engine", engine]
    print(f"info: running {' '.join(cmd)}", file=sys.stderr)
    res = subprocess.run(cmd, cwd=str(ACADEMIC_PDF_SKILL), check=False)
    if res.returncode != 0:
        sys.exit(f"error: extractor exited with code {res.returncode}")


# ─────────────────────────── caption enrichment ───────────────────────────

FIG_PATTERNS = [
    re.compile(r"Fig(?:ure)?\.?\s*(\d+)\s*[|│:.]\s*(.+?)(?=(?:\n\s*\n|Fig(?:ure)?\.?\s*\d+\s*[|│:.]|Table\s+\d+|\Z))", re.DOTALL | re.IGNORECASE),
]
TABLE_PATTERNS = [
    re.compile(r"Table\s+(\d+)\s*[|│:.]\s*(.+?)(?=(?:\n\s*\n|Fig(?:ure)?\.?\s*\d+\s*[|│:.]|Table\s+\d+|\Z))", re.DOTALL | re.IGNORECASE),
]


def parse_captions_from_fulltext(text: str, patterns) -> dict[int, str]:
    out: dict[int, str] = {}
    for pat in patterns:
        for m in pat.finditer(text):
            try:
                n = int(m.group(1))
            except (TypeError, ValueError):
                continue
            cap = re.sub(r"\s+", " ", m.group(2).strip())
            if n not in out and 10 <= len(cap) <= 800:
                out[n] = cap
    return out


# ─────────────────────────── file placement ───────────────────────────

def place_outputs(
    folder: Path,
    src_extract_dir: Path,
    fig_captions: dict[int, str],
    tab_captions: dict[int, str],
) -> dict:
    """Move/rename extractor outputs into our canonical layout."""
    slug = folder.name
    paper_dir = PAPERS / slug
    figures_dir = paper_dir / "figures"
    tables_dir = paper_dir / "tables"
    pages_dir = paper_dir / "pages"
    for d in (paper_dir, figures_dir, tables_dir, pages_dir):
        d.mkdir(parents=True, exist_ok=True)

    counts = {"figures": 0, "tables": 0, "pages": 0, "fulltext": False}

    # Fulltext — the extractor names it {paper_id}-fulltext.md, where paper_id is
    # derived from the PDF basename ("00-source"). We always rename to {slug}-fulltext.md.
    fulltext_candidates = list(src_extract_dir.glob("*-fulltext.md"))
    if fulltext_candidates:
        src_ft = fulltext_candidates[0]
        dest_ft = folder / f"{slug}-fulltext.md"
        # Prepend our standard frontmatter & rewrite the extractor's stub frontmatter
        original = src_ft.read_text(encoding="utf-8")
        body = re.sub(r"^---.*?---\n+", "", original, count=1, flags=re.DOTALL)
        new_frontmatter = (
            "---\n"
            f'type: paper-fulltext\n'
            f'paper_folder: "{slug}"\n'
            f'extracted_by: "academic-pdf-to-mkd (docling)"\n'
            f'extracted_date: "{_today()}"\n'
            "---\n\n"
        )
        dest_ft.write_text(new_frontmatter + body, encoding="utf-8")
        counts["fulltext"] = True
        print(f"  wrote {dest_ft.relative_to(REPO_ROOT)}")

    # Figures
    fig_src = src_extract_dir / "figures"
    if fig_src.is_dir():
        for png in sorted(fig_src.glob("*-figure-*.png")):
            m = re.search(r"-figure-(\d+)\.png$", png.name)
            if not m:
                continue
            n = int(m.group(1))
            padded = f"{n:02d}"
            dest_png = figures_dir / f"{slug}-figure-{padded}.png"
            shutil.copy2(png, dest_png)

            # Caption: enriched if upstream md has it, else from our regex scan
            md_src = png.with_suffix(".md")
            caption = ""
            if md_src.is_file():
                md_text = md_src.read_text(encoding="utf-8")
                m_cap = re.search(r'^caption:\s*"?(.*?)"?\s*$', md_text, re.MULTILINE)
                if m_cap:
                    caption = m_cap.group(1).strip()
            if not caption and n in fig_captions:
                caption = fig_captions[n]

            dest_md = figures_dir / f"{slug}-figure-{padded}.md"
            dest_md.write_text(_fig_md(slug, padded, dest_png.name, caption), encoding="utf-8")
            counts["figures"] += 1
        print(f"  wrote {counts['figures']} figures into {figures_dir.relative_to(REPO_ROOT)}/")

    # Tables
    tab_src = src_extract_dir / "tables"
    if tab_src.is_dir():
        for csv in sorted(tab_src.glob("*-table-*.csv")):
            m = re.search(r"-table-(\d+)\.csv$", csv.name)
            if not m:
                continue
            n = int(m.group(1))
            padded = f"{n:02d}"
            dest_csv = tables_dir / f"{slug}-table-{padded}.csv"
            shutil.copy2(csv, dest_csv)

            md_src = csv.with_suffix(".md")
            caption = ""
            md_table_body = ""
            if md_src.is_file():
                md_text = md_src.read_text(encoding="utf-8")
                m_cap = re.search(r'^caption:\s*"?(.*?)"?\s*$', md_text, re.MULTILINE)
                if m_cap:
                    caption = m_cap.group(1).strip()
                m_body = re.search(r"## Data\s*\n+(.*)$", md_text, re.DOTALL)
                if m_body:
                    md_table_body = m_body.group(1).strip()
            if not caption and n in tab_captions:
                caption = tab_captions[n]

            dest_md = tables_dir / f"{slug}-table-{padded}.md"
            dest_md.write_text(_table_md(slug, padded, dest_csv.name, caption, md_table_body), encoding="utf-8")
            counts["tables"] += 1
        print(f"  wrote {counts['tables']} tables into {tables_dir.relative_to(REPO_ROOT)}/")

    # Page thumbnails
    pages_src = src_extract_dir / "pages"
    if pages_src.is_dir():
        for png in sorted(pages_src.glob("page-*.png")):
            m = re.search(r"page-(\d+)\.png$", png.name)
            if not m:
                continue
            padded = m.group(1).zfill(3)
            dest = pages_dir / f"{slug}-page-{padded}.png"
            shutil.copy2(png, dest)
            counts["pages"] += 1
        print(f"  wrote {counts['pages']} page thumbnails into {pages_dir.relative_to(REPO_ROOT)}/")

    return counts


def _fig_md(slug: str, n: str, image_file: str, caption: str) -> str:
    cap_escaped = caption.replace('"', '\\"')
    return f"""---
type: figure
figure_id: "{n}"
paper_folder: "{slug}"
image_file: "{image_file}"
caption: "{cap_escaped}"
links:
  - "[[{slug}/00-source-{slug}]]"
---

# Figure {n}

![Figure {n}]({image_file})

## Caption

{caption or "_(Caption not captured — check the source paper or fulltext.)_"}

## Description

TODO: Describe the figure in plain language for cross-paper linking.
"""


def _table_md(slug: str, n: str, csv_file: str, caption: str, md_body: str) -> str:
    cap_escaped = caption.replace('"', '\\"')
    body = md_body or "_(Table body not extracted — see CSV.)_"
    return f"""---
type: table
table_id: "{n}"
paper_folder: "{slug}"
data_file: "{csv_file}"
caption: "{cap_escaped}"
links:
  - "[[{slug}/00-source-{slug}]]"
---

# Table {n}

## Caption

{caption or "_(Caption not captured — check the source paper or fulltext.)_"}

## Data

{body}

## Source

- CSV: [`{csv_file}`]({csv_file})
"""


# ─────────────────────────── papers.yaml update ───────────────────────────

def update_papers_yaml(folder_name: str, counts: dict) -> None:
    if not INDEX_FILE.is_file():
        return
    text = INDEX_FILE.read_text(encoding="utf-8")
    # Find the block for this folder
    pat = re.compile(rf'^(  [A-Z0-9]+:\n(?:.*\n)*?    folder_name: "{re.escape(folder_name)}"\n(?:.*\n)*?)(?=^  [A-Z0-9]+:|\nmeta:|\Z)', re.MULTILINE)
    m = pat.search(text)
    if not m:
        print(f"warning: no papers.yaml block for folder {folder_name}", file=sys.stderr)
        return
    block = m.group(1)
    # Inject rich_extraction summary lines (idempotent: replace if present)
    rich_block = (
        "    rich_extraction:\n"
        f"      figures: {counts.get('figures', 0)}\n"
        f"      tables: {counts.get('tables', 0)}\n"
        f"      pages: {counts.get('pages', 0)}\n"
        f'      date: "{_today()}"\n'
        f'      engine: "academic-pdf-to-mkd (docling)"\n'
    )
    if "    rich_extraction:" in block:
        new_block = re.sub(
            r"    rich_extraction:\n(?:      .*\n)*",
            rich_block,
            block,
            count=1,
        )
    else:
        new_block = block.rstrip("\n") + "\n" + rich_block
    INDEX_FILE.write_text(text.replace(block, new_block), encoding="utf-8")


def _today() -> str:
    import datetime as dt
    return dt.date.today().isoformat()


# ─────────────────────────── main ───────────────────────────

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("folder", help="Paper folder slug or substring (under papers/).")
    ap.add_argument("--engine", default="auto", choices=["auto", "docling", "fast", "math", "poppler"])
    ap.add_argument("--keep-temp", action="store_true", help="Keep the temporary extraction directory.")
    ap.add_argument("--no-yaml", action="store_true", help="Skip papers.yaml update.")
    args = ap.parse_args()

    folder = resolve_paper_folder(args.folder)
    print(f"info: paper folder = {folder.relative_to(REPO_ROOT)}", file=sys.stderr)
    pdf = find_source_pdf(folder)
    print(f"info: source PDF  = {pdf.relative_to(REPO_ROOT)}", file=sys.stderr)

    with tempfile.TemporaryDirectory(prefix="paper-rich-") as tmp:
        tmp_path = Path(tmp)
        out_dir = tmp_path / "extract"
        run_extractor(pdf, out_dir, args.engine)

        # Scan fulltext for fallback captions
        fig_caps: dict[int, str] = {}
        tab_caps: dict[int, str] = {}
        ft_candidates = list(out_dir.glob("*-fulltext.md"))
        if ft_candidates:
            full = ft_candidates[0].read_text(encoding="utf-8")
            fig_caps = parse_captions_from_fulltext(full, FIG_PATTERNS)
            tab_caps = parse_captions_from_fulltext(full, TABLE_PATTERNS)

        counts = place_outputs(folder, out_dir, fig_caps, tab_caps)

        if args.keep_temp:
            kept = Path(tempfile.mkdtemp(prefix="paper-rich-kept-"))
            shutil.copytree(out_dir, kept / "extract")
            print(f"info: kept temp output at {kept}/extract", file=sys.stderr)

    if not args.no_yaml:
        update_papers_yaml(folder.name, counts)
        _regen_dashboard()

    print(
        f"\n✓ Rich extraction complete: "
        f"{counts['figures']} figures, {counts['tables']} tables, {counts['pages']} page thumbnails."
    )
    return 0


def _regen_dashboard() -> None:
    """Best-effort: regenerate ai-paper-dashboard.html. Silent on failure."""
    gen = Path(__file__).parent / "generate-dashboard.py"
    if not gen.is_file():
        return
    try:
        subprocess.run([str(gen), "--quiet"], check=False, timeout=60)
    except Exception:
        pass


if __name__ == "__main__":
    sys.exit(main())
