#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""
consolidate-paper-folders.py — Merge paper-analysis/{folder}/ into papers/{folder}/.

Decision (2026-05-17): the repo only ever stores analysed papers, so the
two-tree split (source in papers/, analysis in paper-analysis/) is dead
weight. Everything lives under papers/{folder}/ now:

    papers/{folder}/
    ├── 00-source-{folder}.{md,pdf}
    ├── {folder}-fulltext.md
    ├── figures/{folder}-figure-NN.{png,md}
    ├── tables/{folder}-table-NN.{csv,md}
    ├── pages/{folder}-page-NNN.png
    ├── reviews/{folder}-review-{style}.{md,html}
    ├── highlights/{folder}-highlight-NN.md
    ├── extracts/
    └── notes/

This script:
1. Walks paper-analysis/{folder}/ and moves each file into papers/{folder}/
   preserving subdirectory structure.
2. Handles known-safe duplicates: paper-analysis/.../{folder}-source.md is a
   legacy duplicate of papers/.../00-source-{folder}.md — dropped.
3. Refuses to overwrite unless the destination is byte-identical (then it
   removes the source).
4. Rewrites cross-references in index/papers.yaml, CHANGELOG.md, and
   changelog/*.md by replacing 'paper-analysis/' with 'papers/'.
5. After the move, removes empty paper-analysis/ subdirectories and the
   paper-analysis/ root if empty.

Usage:
    scripts/consolidate-paper-folders.py --dry-run
    scripts/consolidate-paper-folders.py
"""

from __future__ import annotations

import argparse
import filecmp
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
PAPERS = REPO_ROOT / "papers"
PAPER_ANALYSIS = REPO_ROOT / "paper-analysis"
INDEX_FILE = REPO_ROOT / "index" / "papers.yaml"
CHANGELOG_INDEX = REPO_ROOT / "CHANGELOG.md"
CHANGELOG_DIR = REPO_ROOT / "changelog"

LEGACY_SOURCE_SUFFIXES = ("-source.md",)   # paper-analysis/{folder}/{folder}-source.md  (old shape)
SKIP_BASENAMES = {".DS_Store"}


def plan_moves(folder: str) -> tuple[list[tuple[Path, Path]], list[tuple[Path, str]]]:
    """Return (moves, drops). `moves` is list of (src, dst); `drops` is (src, reason)."""
    src_base = PAPER_ANALYSIS / folder
    dst_base = PAPERS / folder
    moves: list[tuple[Path, Path]] = []
    drops: list[tuple[Path, str]] = []
    if not src_base.is_dir():
        return moves, drops
    dst_base.mkdir(parents=True, exist_ok=True)

    for src in src_base.rglob("*"):
        if src.is_dir():
            continue
        if src.name in SKIP_BASENAMES:
            drops.append((src, "ignored basename"))
            continue
        rel = src.relative_to(src_base)
        dst = dst_base / rel

        # Drop legacy {folder}-source.md duplicates if canonical 00-source-{folder}.md exists
        if any(src.name.endswith(suf) for suf in LEGACY_SOURCE_SUFFIXES):
            canonical = dst_base / f"00-source-{folder}.md"
            if canonical.is_file():
                drops.append((src, f"legacy duplicate of {canonical.name}"))
                continue

        moves.append((src, dst))
    return moves, drops


def rewrite_paths_in_text(text: str) -> str:
    """Replace 'paper-analysis/' with 'papers/' in text."""
    return text.replace("paper-analysis/", "papers/")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not PAPER_ANALYSIS.is_dir():
        print("info: no paper-analysis/ directory; nothing to consolidate.")
        return 0

    folders = sorted(d.name for d in PAPER_ANALYSIS.iterdir() if d.is_dir() and not d.name.startswith("."))
    all_moves: list[tuple[Path, Path]] = []
    all_drops: list[tuple[Path, str]] = []
    conflicts: list[tuple[Path, Path, str]] = []

    for f in folders:
        moves, drops = plan_moves(f)
        # Detect conflicts (destination exists, not identical)
        clean_moves = []
        for src, dst in moves:
            if dst.exists():
                if filecmp.cmp(src, dst, shallow=False):
                    all_drops.append((src, f"duplicate of {dst.relative_to(REPO_ROOT)} (identical)"))
                else:
                    conflicts.append((src, dst, "different content already exists at destination"))
            else:
                clean_moves.append((src, dst))
        all_moves.extend(clean_moves)
        all_drops.extend(drops)

    print(f"Plan: move {len(all_moves)}, drop {len(all_drops)}, conflicts {len(conflicts)}.")
    if conflicts:
        print("\nCONFLICTS (these need manual review — script will skip them):")
        for src, dst, reason in conflicts:
            print(f"  ! {src.relative_to(REPO_ROOT)} -> {dst.relative_to(REPO_ROOT)}  ({reason})")
    if all_drops:
        print("\nDROPS (will be deleted):")
        for src, reason in all_drops[:15]:
            print(f"  - {src.relative_to(REPO_ROOT)}  ({reason})")
        if len(all_drops) > 15:
            print(f"  ... and {len(all_drops)-15} more.")
    print("\nMOVES (first 20):")
    for src, dst in all_moves[:20]:
        print(f"  {src.relative_to(REPO_ROOT)} -> {dst.relative_to(REPO_ROOT)}")
    if len(all_moves) > 20:
        print(f"  ... and {len(all_moves)-20} more.")

    if args.dry_run:
        print("\n(dry-run; no changes made.)")
        return 0

    # Execute
    for src, dst in all_moves:
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(src), str(dst))
    for src, _reason in all_drops:
        if src.exists():
            src.unlink()
    print(f"\n✓ Moved {len(all_moves)} files, dropped {len(all_drops)}.")

    # Remove now-empty paper-analysis subdirs (and the root if empty)
    for d in sorted(PAPER_ANALYSIS.rglob("*"), reverse=True):
        if d.is_dir():
            try:
                d.rmdir()
            except OSError:
                pass
    if PAPER_ANALYSIS.is_dir():
        try:
            PAPER_ANALYSIS.rmdir()
            print(f"✓ Removed empty {PAPER_ANALYSIS.relative_to(REPO_ROOT)}/")
        except OSError as e:
            print(f"warning: could not remove {PAPER_ANALYSIS.relative_to(REPO_ROOT)}/ ({e}); remove manually.")

    # Rewrite cross-references
    targets: list[Path] = []
    if INDEX_FILE.is_file():
        targets.append(INDEX_FILE)
    if CHANGELOG_INDEX.is_file():
        targets.append(CHANGELOG_INDEX)
    if CHANGELOG_DIR.is_dir():
        targets.extend(sorted(CHANGELOG_DIR.glob("*.md")))
    n_rewrote = 0
    for p in targets:
        old = p.read_text(encoding="utf-8")
        new = rewrite_paths_in_text(old)
        if new != old:
            p.write_text(new, encoding="utf-8")
            print(f"  rewrote refs in {p.relative_to(REPO_ROOT)}")
            n_rewrote += 1
    print(f"✓ Rewrote cross-references in {n_rewrote} files.")

    if conflicts:
        print("\n⚠ Conflicts remain — see list above. Resolve manually then re-run.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
