#!/usr/bin/env python3
"""
zotero-import.py — Import a paper directly from Zotero into this repo.

Talks to Better BibTeX's JSON-RPC endpoint on localhost:23119, resolves a
query (title fragment, author + year, DOI, URL, or citation key) to a Zotero
item, then:

  1. Creates papers/{slug}-{key}/
  2. Copies the PDF attachment to 00-source.pdf
  3. Writes 00-source.md (YAML frontmatter with full metadata + abstract)
  4. Extracts fulltext via pdftotext into {slug}-{key}-fulltext.md
  5. Appends an entry to index/papers.yaml (idempotent: skips if key exists)

Usage:
  scripts/zotero-import.py "Training language models to be warm"
  scripts/zotero-import.py "ibrahimTrainingLanguageModels2026"
  scripts/zotero-import.py "10.1038/s41586-026-10410-0"
  scripts/zotero-import.py "https://www.nature.com/articles/s41586-026-10410-0"
  scripts/zotero-import.py --slug warmth-accuracy-tradeoff "Training language models..."

Requirements: Zotero with Better BibTeX extension running, pdftotext (poppler).

Conventions match AGENTS.md / skill/references/workflow-import.md:
  - zotero_key = Zotero *item* key (e.g. GVTV73KH), not attachment storage key.
  - folder = {first-author-lastname}-{year}-{slug}-{key}.
  - PDF lives at papers/{folder}/00-source.pdf.
  - Fulltext lives at papers/{folder}/{folder}-fulltext.md.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

BBT_RPC_URL = "http://localhost:23119/better-bibtex/json-rpc"
REPO_ROOT = Path(__file__).resolve().parent.parent
PAPERS_DIR = REPO_ROOT / "papers"
INDEX_FILE = REPO_ROOT / "index" / "papers.yaml"

STOPWORDS = {
    "a", "an", "the", "and", "or", "of", "for", "in", "on", "to", "with",
    "from", "by", "at", "as", "is", "are", "be", "can", "this", "that",
    "their", "its", "into", "via", "using", "study", "evaluation",
}


def bbt_call(method: str, params):
    """Make a JSON-RPC call to Better BibTeX."""
    payload = json.dumps({
        "jsonrpc": "2.0",
        "method": method,
        "params": params,
        "id": 1,
    }).encode("utf-8")
    req = urllib.request.Request(
        BBT_RPC_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
    except urllib.error.URLError as exc:
        sys.exit(
            f"error: cannot reach Better BibTeX at {BBT_RPC_URL}: {exc}\n"
            "Is Zotero running with the Better BibTeX extension enabled?"
        )
    data = json.loads(body)
    if "error" in data and data["error"]:
        sys.exit(f"error: BBT returned {data['error']}")
    return data.get("result")


def search_item(query: str):
    """Find a Zotero item matching the query (title fragment, DOI, URL, citekey)."""
    result = bbt_call("item.search", [query])
    if not result:
        sys.exit(f"error: no Zotero item matched query: {query!r}")
    if len(result) > 1:
        print(f"warning: {len(result)} items matched; using the first.", file=sys.stderr)
        for i, item in enumerate(result):
            title = item.get("title", "(no title)")
            print(f"  [{i}] {title}", file=sys.stderr)
    return result[0]


def export_item(citekey: str):
    """Export the full BBT JSON record for a given citation key.

    Provides authoritative attachment paths and the Zotero item key.
    """
    result = bbt_call("item.export", [[citekey], "jzon"])
    payload = json.loads(result)
    items = payload.get("items", [])
    if not items:
        sys.exit(f"error: BBT export returned no items for citekey {citekey!r}")
    return items[0]


def slugify_title(title: str, max_words: int = 4) -> str:
    """Generate a kebab-case slug of <= max_words from a title."""
    words = re.findall(r"[A-Za-z0-9]+", title.lower())
    keep = [w for w in words if w not in STOPWORDS]
    if not keep:
        keep = words
    return "-".join(keep[:max_words])


def author_lastname(item: dict) -> str:
    """Extract the first author's lastname, lowercased."""
    creators = item.get("creators") or []
    for c in creators:
        if c.get("creatorType") in (None, "author"):
            return (c.get("lastName") or c.get("name") or "anonymous").split()[0].lower()
    return "anonymous"


def year_of(item: dict) -> str:
    date = item.get("date", "") or ""
    m = re.search(r"\d{4}", date)
    return m.group(0) if m else "n.d."


def find_pdf(item: dict) -> Path | None:
    """Return the local PDF path from item attachments, if any."""
    for att in item.get("attachments", []) or []:
        path = att.get("path")
        if path and path.lower().endswith(".pdf") and Path(path).is_file():
            return Path(path)
    return None


def render_yaml_value(value) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, list):
        if not value:
            return "[]"
        return "\n" + "\n".join(f"  - {render_yaml_inline(v)}" for v in value)
    return render_yaml_inline(value)


def render_yaml_inline(value) -> str:
    s = str(value)
    if s == "":
        return '""'
    if any(c in s for c in ":{}[],&*#?|<>=!%@`\"'\n"):
        return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'
    return s


def write_source_md(folder: Path, item: dict, pdf_rel: str, zotero_storage: str | None, folder_name: str) -> Path:
    """Write 00-source-{folder}.md with YAML frontmatter (new fully-qualified-name convention)."""
    creators = []
    for c in item.get("creators", []) or []:
        if "lastName" in c:
            given = c.get("firstName", "")
            creators.append(f"{c['lastName']}, {given}".strip(", "))
        elif "name" in c:
            creators.append(c["name"])

    tags = [t.get("tag") for t in item.get("tags", []) or [] if t.get("tag")]
    collections = item.get("collections", []) or []

    title = item.get("title", "").strip()
    abstract = (item.get("abstractNote", "") or "").strip()

    fm_lines = [
        "---",
        f"zotero_key: {item.get('itemKey', item.get('key', ''))}",
    ]
    if zotero_storage:
        fm_lines.append(f"attachment_storage_key: {zotero_storage}")
    fm_lines += [
        f"item_id: {item.get('itemID', '')}",
        f"library_id: {item.get('libraryID', 1)}",
        f"item_type: {item.get('itemType', '')}",
        f'title: "{title.replace(chr(34), chr(92)+chr(34))}"',
        "creators:",
    ]
    for name in creators:
        fm_lines.append(f"  - {render_yaml_inline(name)}")
    fm_lines += [
        f"year: '{year_of(item)}'",
        f"date: '{item.get('date', '')}'",
        f"publication_title: {render_yaml_inline(item.get('publicationTitle', '')) or '\"\"'}",
        f"volume: {render_yaml_inline(item.get('volume', '')) or '\"\"'}",
        f"issue: {render_yaml_inline(item.get('issue', '')) or '\"\"'}",
        f"pages: {render_yaml_inline(item.get('pages', '')) or '\"\"'}",
        f"publisher: {render_yaml_inline(item.get('publisher', '')) or '\"\"'}",
        f"language: {item.get('language', 'en')}",
        f"doi: {render_yaml_inline(item.get('DOI', '')) or '\"\"'}",
        f"issn: {render_yaml_inline(item.get('ISSN', '')) or '\"\"'}",
        f"url: {item.get('url', '')}",
        f"citation_key: {item.get('citationKey', '')}",
    ]
    fm_lines.append("tags:")
    for t in tags:
        fm_lines.append(f"  - {render_yaml_inline(t)}")
    if not tags:
        fm_lines[-1] = "tags: []"
    fm_lines.append(f"collections: {render_yaml_value(collections)}" if collections else "collections: []")
    fm_lines += [
        "abstract: >-",
    ]
    # Fold abstract to 110-char lines
    for line in _fold(abstract, 110):
        fm_lines.append(f"  {line}")
    fm_lines += [
        f"date_added: {item.get('dateAdded', '')}",
        f"date_modified: {item.get('dateModified', '')}",
        f'pdf_location: "{pdf_rel}"',
        "highlights_extracted: false",
        f'imported_date: "{_today()}"',
        "---",
        "",
        f"# {title}",
        "",
        "## Highlights",
        "",
        "None imported.",
        "",
        "## Notes",
        "",
        "None",
        "",
    ]
    source_md = folder / f"00-source-{folder_name}.md"
    source_md.write_text("\n".join(fm_lines), encoding="utf-8")
    return source_md


def _fold(text: str, width: int) -> list[str]:
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return [""]
    out, line = [], ""
    for word in text.split():
        if line and len(line) + 1 + len(word) > width:
            out.append(line)
            line = word
        else:
            line = word if not line else f"{line} {word}"
    if line:
        out.append(line)
    return out


def _today() -> str:
    from datetime import date
    return date.today().isoformat()


def extract_fulltext(pdf: Path, dest: Path, item_key: str) -> None:
    """Run pdftotext -layout > dest. Falls back gracefully if pdftotext absent."""
    if shutil.which("pdftotext") is None:
        print("warning: pdftotext not installed; skipping fulltext extraction.", file=sys.stderr)
        return
    proc = subprocess.run(
        ["pdftotext", "-layout", str(pdf), "-"],
        capture_output=True, text=True, check=False,
    )
    if proc.returncode != 0:
        print(f"warning: pdftotext exit {proc.returncode}: {proc.stderr.strip()}", file=sys.stderr)
        return
    dest.write_text(f"# Extracted Full Text — {item_key}\n\n{proc.stdout}", encoding="utf-8")


def folder_name_for(item: dict, slug_override: str | None) -> str:
    key = item.get("itemKey") or item.get("key") or "NOKEY"
    return f"{author_lastname(item)}-{year_of(item)}-{slug_override or slugify_title(item.get('title', ''))}-{key}"


def update_papers_yaml(item: dict, folder: str, review_paths: dict) -> None:
    """Append a paper entry to index/papers.yaml if not already present.

    Conservative: only appends, never edits existing entries.
    """
    key = item.get("itemKey") or item.get("key")
    if not key:
        print("warning: no item key; skipping papers.yaml update.", file=sys.stderr)
        return
    if not INDEX_FILE.is_file():
        print(f"warning: {INDEX_FILE} not found; skipping update.", file=sys.stderr)
        return

    text = INDEX_FILE.read_text(encoding="utf-8")
    if re.search(rf"^  {re.escape(key)}:\s*$", text, re.MULTILINE):
        print(f"info: {key} already present in papers.yaml; not modifying.", file=sys.stderr)
        return

    creators = []
    for c in item.get("creators", []) or []:
        if "lastName" in c:
            creators.append(c["lastName"])
    authors_str = creators[0] + " et al." if len(creators) > 1 else (creators[0] if creators else "Anonymous")
    if len(creators) == 2:
        authors_str = f"{creators[0]} & {creators[1]}"
    if len(creators) == 3:
        authors_str = f"{creators[0]}, {creators[1]} & {creators[2]}"

    title = item.get("title", "").replace('"', '\\"')
    year = year_of(item)
    venue = item.get("publicationTitle", "")
    vol_iss = ""
    if item.get("volume"):
        vol_iss = item["volume"]
        if item.get("issue"):
            vol_iss += f"({item['issue']})"
    pages = item.get("pages", "")
    if venue:
        venue_str = venue + (f" {vol_iss}" if vol_iss else "") + (f": {pages}" if pages else "")
    else:
        venue_str = ""

    entry_lines = [
        "",
        f"  {key}:",
        f'    title: "{title}"',
        f'    authors: "{authors_str}"',
        f"    year: {year}",
        f"    folder_name: \"{folder}\"",
        f"    path: \"papers/{folder}/\"",
    ]
    if venue_str:
        entry_lines.append(f'    venue: "{venue_str}"')
    if item.get("DOI"):
        entry_lines.append(f'    doi: "{item["DOI"]}"')
    entry_lines += [
        "    collections: []",
        "    status: imported",
        f'    imported_date: "{_today()}"',
        "    reviews: []",
        "    extracts:",
        f'      - type: "full-text"',
        f"        file: \"papers/{folder}/{folder}-fulltext.md\"",
        f'        date: "{_today()}"',
        "    notes: []",
    ]

    # Insert before the meta: block
    new_text, n = re.subn(
        r"(\n)(meta:\n)",
        "\n".join(entry_lines) + r"\n\1\2",
        text,
        count=1,
    )
    if n == 0:
        # No meta block — just append
        new_text = text.rstrip() + "\n" + "\n".join(entry_lines) + "\n"

    # Bump meta.total_papers and last_updated where present
    new_text = re.sub(
        r"(\n  total_papers:\s+)(\d+)",
        lambda m: f"{m.group(1)}{int(m.group(2)) + 1}",
        new_text,
        count=1,
    )
    new_text = re.sub(
        r"(\n  last_updated:\s+)\"[^\"]*\"",
        lambda m: f'{m.group(1)}"{_today()}"',
        new_text,
        count=1,
    )

    INDEX_FILE.write_text(new_text, encoding="utf-8")
    print(f"info: appended {key} to {INDEX_FILE.relative_to(REPO_ROOT)}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("query", help="Title fragment, citation key, DOI, or URL.")
    ap.add_argument("--slug", help="Override the title slug part of the folder name.")
    ap.add_argument("--no-fulltext", action="store_true", help="Skip pdftotext extraction.")
    ap.add_argument("--no-yaml", action="store_true", help="Skip papers.yaml update.")
    ap.add_argument("--rich", action="store_true", help="Run layout-aware extraction (academic-pdf-to-mkd / docling) instead of pdftotext. Produces figures + tables as separate files.")
    ap.add_argument("--print-only", action="store_true", help="Show what would be done, do nothing.")
    args = ap.parse_args()

    print(f"info: querying Better BibTeX for {args.query!r}…")
    search_result = search_item(args.query)
    citekey = search_result.get("citation-key") or search_result.get("citekey")
    if not citekey:
        sys.exit("error: matched item has no citation key.")
    print(f"info: matched citekey {citekey}")

    item = export_item(citekey)
    item_key = item.get("itemKey") or item.get("key")
    folder = folder_name_for(item, args.slug)
    pdf_src = find_pdf(item)
    storage_key = None
    if pdf_src:
        # Zotero storage paths look like .../storage/{KEY}/{file}.pdf
        parts = pdf_src.parts
        if "storage" in parts:
            i = parts.index("storage")
            if i + 1 < len(parts):
                storage_key = parts[i + 1]

    print(f"info: folder = papers/{folder}/")
    print(f"info: PDF = {pdf_src or '(none found)'}")
    if args.print_only:
        print("info: --print-only; stopping.")
        return 0

    paper_dir = PAPERS_DIR / folder
    paper_dir.mkdir(parents=True, exist_ok=True)

    pdf_rel = ""
    if pdf_src:
        dest_pdf = paper_dir / f"00-source-{folder}.pdf"
        if not dest_pdf.exists():
            shutil.copy2(pdf_src, dest_pdf)
            print(f"info: copied PDF -> {dest_pdf.relative_to(REPO_ROOT)}")
        pdf_rel = str(dest_pdf.relative_to(REPO_ROOT))
    else:
        print("warning: no PDF attachment found; PDF not created.")

    source_md = write_source_md(paper_dir, item, pdf_rel, storage_key, folder)
    print(f"info: wrote {source_md.relative_to(REPO_ROOT)}")

    fulltext_written = False
    if pdf_src and not args.no_fulltext and not args.rich:
        fulltext = paper_dir / f"{folder}-fulltext.md"
        extract_fulltext(paper_dir / f"00-source-{folder}.pdf", fulltext, item_key)
        print(f"info: wrote {fulltext.relative_to(REPO_ROOT)}")
        fulltext_written = True

    if not args.no_yaml:
        update_papers_yaml(item, folder, {})
        _regen_dashboard()

    if pdf_src and args.rich:
        print("info: running rich extraction (academic-pdf-to-mkd / docling)…")
        rich_script = Path(__file__).parent / "extract-paper-rich.py"
        rc = subprocess.run([str(rich_script), folder], check=False).returncode
        if rc != 0:
            print(f"warning: rich extraction exited with code {rc}", file=sys.stderr)

    print(f"\nNext step: write a review under papers/{folder}/reviews/")
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
