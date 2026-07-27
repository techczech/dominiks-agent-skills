#!/usr/bin/env python3
"""Append a disciplined one-line JSON entry to changelog/logs/worklog.jsonl.

Enforces the per-line size cap. Refuses entries that exceed the cap so that
detailed warnings and errors must be written to separate run-artifact files.

Usage:
  append_worklog.py --action export --status completed --run-id 20260417T104205Z-export
                    [--duration 42.1]
                    [--input path] [--output path]
                    [--count records=12101] [--count assets=7576]
                    [--warning-count 108] [--warnings-path derived/run-logs/.../warnings.json]
                    [--error-count 0]  [--errors-path ...]
                    [--phase phase-2-export]
                    [--timestamp 2026-04-17T10:42:05+00:00]
                    [--changelog-dir path]
"""
import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import load_config, resolve_changelog_dir  # noqa: E402

DEFAULT_MAX_LINE_BYTES = 2048


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--action", required=True)
    p.add_argument("--status", required=True)
    p.add_argument("--run-id", required=True)
    p.add_argument("--duration", type=float)
    p.add_argument("--input", action="append", default=[])
    p.add_argument("--output", action="append", default=[])
    p.add_argument("--count", action="append", default=[],
                   help="key=value (repeatable). Integer values parsed as int.")
    p.add_argument("--warning-count", type=int)
    p.add_argument("--error-count", type=int)
    p.add_argument("--warnings-path")
    p.add_argument("--errors-path")
    p.add_argument("--phase")
    p.add_argument("--timestamp")
    p.add_argument("--changelog-dir")
    args = p.parse_args()

    cdir = resolve_changelog_dir(args.changelog_dir)
    cfg = load_config(cdir)
    max_bytes = cfg.get("worklog_max_line_bytes", DEFAULT_MAX_LINE_BYTES)

    counts = {}
    for kv in args.count:
        if "=" not in kv:
            sys.exit(f"bad --count {kv!r}, expected key=value")
        k, v = kv.split("=", 1)
        try:
            counts[k] = int(v)
        except ValueError:
            counts[k] = v

    ts = args.timestamp or datetime.now(timezone.utc).isoformat(timespec="seconds")

    entry = {
        "timestamp": ts,
        "run_id": args.run_id,
        "action": args.action,
        "status": args.status,
    }
    if args.duration is not None:
        entry["duration_s"] = args.duration
    if args.input:
        entry["inputs"] = args.input
    if args.output:
        entry["outputs"] = args.output
    if counts:
        entry["record_counts"] = counts
    if args.warning_count is not None:
        entry["warning_count"] = args.warning_count
    if args.error_count is not None:
        entry["error_count"] = args.error_count
    if args.warnings_path:
        entry["warnings_path"] = args.warnings_path
    if args.errors_path:
        entry["errors_path"] = args.errors_path
    if args.phase:
        entry["phase"] = args.phase

    line = json.dumps(entry, ensure_ascii=False)
    size = len(line.encode("utf-8"))
    if size > max_bytes:
        sys.exit(
            f"error: entry is {size} bytes, exceeds cap of {max_bytes}. "
            "Move detailed warnings/errors to a file and reference via "
            "--warnings-path / --errors-path."
        )

    logpath = cdir / "logs" / "worklog.jsonl"
    logpath.parent.mkdir(parents=True, exist_ok=True)
    with logpath.open("a") as f:
        f.write(line + "\n")
    print(line)


if __name__ == "__main__":
    main()
