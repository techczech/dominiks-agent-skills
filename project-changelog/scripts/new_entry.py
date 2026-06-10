#!/usr/bin/env python3
"""Create a new changelog entry from a template.

Usage:
  new_entry.py --type {change,decision,phase,backlog} --title "..." [--id slug]
               [--date YYYY-MM-DD] [--changelog-dir path]
               [--priority {low,medium,high,critical}] [--owner NAME]
               [--depends-on ENTRY_ID] [--artifact PATH_OR_URL]
"""
import argparse
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import (
    SKILL_DIR,
    parse_frontmatter,
    resolve_changelog_dir,
    serialize_frontmatter,
    slugify,
)  # noqa: E402

BUCKET = {
    "change": "changes",
    "decision": "decisions",
    "phase": "phases",
    "backlog": "backlog",
}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--type", required=True, choices=list(BUCKET))
    p.add_argument("--title", required=True)
    p.add_argument("--id", help="Stable slug. Defaults to slugified title.")
    p.add_argument("--changelog-dir")
    p.add_argument("--date", default=date.today().isoformat())
    p.add_argument("--priority", choices=["low", "medium", "high", "critical"])
    p.add_argument("--owner", action="append", default=[])
    p.add_argument("--depends-on", action="append", default=[])
    p.add_argument("--artifact", action="append", default=[])
    args = p.parse_args()

    backlog_args_used = any(
        [args.priority, args.owner, args.depends_on, args.artifact]
    )
    if args.type != "backlog" and backlog_args_used:
        sys.exit(
            "error: --priority, --owner, --depends-on, and --artifact are only "
            "supported for backlog entries"
        )

    cdir = resolve_changelog_dir(args.changelog_dir)
    bucket = cdir / BUCKET[args.type]
    bucket.mkdir(parents=True, exist_ok=True)

    eid = args.id or slugify(args.title)
    if args.type in ("decision", "phase") and not args.id:
        eid = f"{args.date}-{eid}"

    fname = bucket / f"{eid}.md"
    if fname.exists():
        sys.exit(f"error: {fname} already exists")

    template_path = SKILL_DIR / "assets" / "templates" / f"{args.type}.md"
    content = template_path.read_text()
    content = (
        content.replace("{{TITLE}}", args.title)
        .replace("{{ID}}", eid)
        .replace("{{DATE}}", args.date)
    )

    if args.type == "backlog" and backlog_args_used:
        meta, body = parse_frontmatter(content)
        if args.priority:
            meta["priority"] = args.priority
        if args.owner:
            meta["owner"] = args.owner[0] if len(args.owner) == 1 else args.owner
        if args.depends_on:
            meta["depends_on"] = args.depends_on
        if args.artifact:
            meta["artifacts"] = args.artifact
        content = serialize_frontmatter(meta) + body

    fname.write_text(content)
    print(fname)


if __name__ == "__main__":
    main()
