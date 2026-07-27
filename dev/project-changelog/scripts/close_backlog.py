#!/usr/bin/env python3
"""Close a backlog item, linking the resolving change.

Usage:
  close_backlog.py <backlog_id> --resolved-by <change_id>
                   [--date YYYY-MM-DD] [--changelog-dir path]
"""
import argparse
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import find_entry, resolve_changelog_dir, update_entry  # noqa: E402


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("backlog_id")
    p.add_argument("--resolved-by", required=True)
    p.add_argument("--changelog-dir")
    p.add_argument("--date", default=date.today().isoformat())
    args = p.parse_args()

    cdir = resolve_changelog_dir(args.changelog_dir)
    backlog_path = find_entry(cdir / "backlog", args.backlog_id)
    change_path = find_entry(cdir / "changes", args.resolved_by)
    if not backlog_path:
        sys.exit(f"error: backlog item {args.backlog_id!r} not found")
    if not change_path:
        sys.exit(f"error: change {args.resolved_by!r} not found")

    update_entry(backlog_path, {
        "status": "done",
        "updated": args.date,
        "refs": {"resolved_by": args.resolved_by},
    })
    update_entry(change_path, {
        "updated": args.date,
        "refs": {"resolves": args.backlog_id},
    })
    print(f"closed  {backlog_path}")
    print(f"linked  {change_path}")


if __name__ == "__main__":
    main()
