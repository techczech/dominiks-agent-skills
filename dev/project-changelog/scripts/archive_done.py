#!/usr/bin/env python3
"""Move done/dropped backlog items older than threshold into archive/backlog/YYYY/.

Usage:
  archive_done.py [--older-than 90d] [--changelog-dir path] [--dry-run]
"""
import argparse
import re
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import parse_frontmatter, resolve_changelog_dir  # noqa: E402


def parse_duration(s):
    m = re.match(r"^(\d+)([dwmy])$", s)
    if not m:
        raise argparse.ArgumentTypeError(f"bad duration {s!r}, expected e.g. 90d, 12w")
    n, unit = int(m.group(1)), m.group(2)
    return timedelta(days=n * {"d": 1, "w": 7, "m": 30, "y": 365}[unit])


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--older-than", default="90d", type=parse_duration)
    p.add_argument("--changelog-dir")
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    cdir = resolve_changelog_dir(args.changelog_dir)
    bdir = cdir / "backlog"
    if not bdir.exists():
        print("no backlog/ directory; nothing to do")
        return

    cutoff = date.today() - args.older_than
    moved = 0
    skipped = 0
    for path in sorted(bdir.glob("*.md")):
        meta, _ = parse_frontmatter(path.read_text())
        if meta.get("type") != "backlog":
            continue
        if meta.get("status") not in ("done", "dropped"):
            continue
        updated = meta.get("updated") or meta.get("date")
        if not updated:
            skipped += 1
            continue
        try:
            udate = datetime.strptime(str(updated), "%Y-%m-%d").date()
        except ValueError:
            skipped += 1
            continue
        if udate > cutoff:
            continue
        target = cdir / "archive" / "backlog" / udate.strftime("%Y") / path.name
        if args.dry_run:
            print(f"would move {path.relative_to(cdir)} -> {target.relative_to(cdir)}")
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            path.rename(target)
            print(f"moved {path.name} -> archive/backlog/{udate.strftime('%Y')}/")
        moved += 1

    verb = "would be archived" if args.dry_run else "archived"
    print(f"{moved} item(s) {verb}" + (f", {skipped} skipped (missing/bad date)" if skipped else ""))


if __name__ == "__main__":
    main()
