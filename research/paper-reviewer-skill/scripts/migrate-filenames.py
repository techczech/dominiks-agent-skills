#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["PyYAML>=6.0"]
# ///
"""
migrate-filenames.py — One-shot rename to the fully-qualified filename convention.

New convention: every file inside a paper folder is prefixed with the folder
name (which already contains author-year-slug-zoteroKey). This makes filenames
self-identifying out of folder context — they survive search, git log,
attachments, and agent context windows.

Renames performed per paper folder (idempotent — skips if already renamed):

  papers/{folder}/00-source.md             -> 00-source-{folder}.md
  papers/{folder}/00-source.pdf            -> 00-source-{folder}.pdf
  papers/{folder}/00-supplementary*.pdf    -> 00-supplementary-{folder}.pdf
  paper-analysis/{folder}/reviews/X.md     -> {folder}-review-X.md
  paper-analysis/{folder}/00-source.md     -> 00-source-{folder}.md  (legacy)

Also rewrites cross-references inside:
  - index/papers.yaml
  - changelog/*.md
  - CHANGELOG.md

Usage:
  scripts/migrate-filenames.py --dry-run
  scripts/migrate-filenames.py
  scripts/migrate-filenames.py --folder ibrahim-2026   # one folder substring
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
PAPERS = REPO_ROOT / "papers"
PAPER_ANALYSIS = REPO_ROOT / "paper-analysis"
CHANGELOG_DIR = REPO_ROOT / "changelog"
INDEX_FILE = REPO_ROOT / "index" / "papers.yaml"
CHANGELOG_INDEX = REPO_ROOT / "CHANGELOG.md"


def all_folders(filter_substr: str | None) -> list[str]:
    """Union of folder names under papers/ and paper-analysis/."""
    names = set()
    for base in (PAPERS, PAPER_ANALYSIS):
        if base.is_dir():
            for d in base.iterdir():
                if d.is_dir() and not d.name.startswith("."):
                    if filter_substr is None or filter_substr in d.name:
                        names.add(d.name)
    return sorted(names)


def plan_renames(folder: str) -> list[tuple[Path, Path]]:
    """Return a list of (old, new) pairs to rename for this folder."""
    pairs: list[tuple[Path, Path]] = []

    # papers/{folder}/
    p_dir = PAPERS / folder
    if p_dir.is_dir():
        for legacy in ("00-source.md", "00-source.pdf"):
            old = p_dir / legacy
            new = p_dir / f"{legacy.rsplit('.', 1)[0]}-{folder}.{legacy.rsplit('.', 1)[1]}"
            if old.is_file() and not new.exists():
                pairs.append((old, new))
        # Supplementary
        for old in p_dir.glob("00-supplementary*.pdf"):
            stem = old.stem
            ext = old.suffix
            # Only rename if folder slug not already present
            if folder not in stem:
                new = p_dir / f"{stem}-{folder}{ext}"
                pairs.append((old, new))

    # paper-analysis/{folder}/00-source.md (legacy double-up)
    a_dir = PAPER_ANALYSIS / folder
    if a_dir.is_dir():
        old = a_dir / "00-source.md"
        new = a_dir / f"00-source-{folder}.md"
        if old.is_file() and not new.exists():
            pairs.append((old, new))
        # paper-analysis/{folder}/reviews/*.md  -> {folder}-review-*.md
        rev_dir = a_dir / "reviews"
        if rev_dir.is_dir():
            for old in rev_dir.glob("*.md"):
                if folder in old.stem or old.name.startswith(f"{folder}-review-"):
                    continue
                new = rev_dir / f"{folder}-review-{old.name}"
                if not new.exists():
                    pairs.append((old, new))
        # Generated HTML reports (rebuildable; just rename in case any are tracked)
        if rev_dir.is_dir():
            for old in rev_dir.glob("*.html"):
                if folder in old.stem:
                    continue
                new = rev_dir / f"{folder}-review-{old.name}"
                if not new.exists():
                    pairs.append((old, new))

    return pairs


def rewrite_references(rename_map: dict[str, str], dry_run: bool) -> int:
    """Update text references across YAML / Markdown to old paths.

    Returns count of files modified.
    """
    targets: list[Path] = []
    if INDEX_FILE.is_file():
        targets.append(INDEX_FILE)
    if CHANGELOG_INDEX.is_file():
        targets.append(CHANGELOG_INDEX)
    if CHANGELOG_DIR.is_dir():
        targets.extend(sorted(CHANGELOG_DIR.glob("*.md")))

    n_modified = 0
    for path in targets:
        text = path.read_text(encoding="utf-8")
        new_text = text
        for old_path, new_path in rename_map.items():
            new_text = new_text.replace(old_path, new_path)
        if new_text != text:
            if not dry_run:
                path.write_text(new_text, encoding="utf-8")
            n_modified += 1
            print(f"  updated refs in {path.relative_to(REPO_ROOT)}")
    return n_modified


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="Print planned renames; change nothing.")
    ap.add_argument("--folder", help="Only operate on folders containing this substring.")
    args = ap.parse_args()

    folders = all_folders(args.folder)
    if not folders:
        sys.exit("error: no folders found.")

    all_pairs: list[tuple[Path, Path]] = []
    for f in folders:
        all_pairs.extend(plan_renames(f))

    if not all_pairs:
        print("info: nothing to rename — all files already follow the convention.")
        return 0

    print(f"info: planning {len(all_pairs)} rename(s)" + (" (DRY RUN)" if args.dry_run else "") + ":")
    rename_map: dict[str, str] = {}
    for old, new in all_pairs:
        rel_old = str(old.relative_to(REPO_ROOT))
        rel_new = str(new.relative_to(REPO_ROOT))
        print(f"  {rel_old}  ->  {rel_new}")
        rename_map[rel_old] = rel_new

    if not args.dry_run:
        for old, new in all_pairs:
            old.rename(new)
        print(f"info: renamed {len(all_pairs)} file(s).")

    # Rewrite references in YAML + markdown
    n = rewrite_references(rename_map, args.dry_run)
    if not args.dry_run:
        print(f"info: rewrote cross-references in {n} file(s).")

    return 0


if __name__ == "__main__":
    sys.exit(main())
