#!/usr/bin/env python3
"""Audit agent instruction files for size, placement, and wordiness risks."""
from __future__ import annotations

import argparse
import re
from pathlib import Path

BLOAT_PATTERNS = {
    "history/background": re.compile(r"\b(history|background|why this exists|rationale|origin|developed|past)\b", re.I),
    "provenance/meta language": re.compile(r"\b(provenance|evolved|came from|created to|pattern exists|auto-?discover|auto-?load|loading semantics)\b", re.I),
    "related/reference list": re.compile(r"\b(related projects|references|further reading|source links|see also)\b", re.I),
    "human overview": re.compile(r"\b(overview|purpose|for humans|about this project)\b", re.I),
    "session/progress log": re.compile(r"\b(session|progress|status update|work log|changelog entry)\b", re.I),
    "legacy instruction folder": re.compile(r"\bagent-instructions/", re.I),
    "self-loading instruction": re.compile(r"\b(load|read|open|consult)\b.{0,80}\bAGENTS\.md\b|\bAGENTS\.md\b.{0,80}\b(load|read|open|consult|automatic|automatically)\b", re.I),
}

WORDY_PATTERNS = {
    "throat-clearing": re.compile(r"\b(use this (skill|reference) whenever|this skill helps|in order to|it is important to)\b", re.I),
    "narrative framing": re.compile(r"\b(this file is|the goal of this|designed to|intended to|helps agents)\b", re.I),
}

GOOD_HEADINGS = {
    "first move",
    "commands",
    "setup",
    "tests",
    "verification",
    "constraints",
    "ownership",
    "routing",
    "do not do",
    "security",
}


def file_kind(path: Path) -> str:
    return path.name.lower()


def iter_targets(paths: list[Path]) -> list[Path]:
    targets: list[Path] = []
    seen: set[str] = set()
    for path in paths:
        if path.is_dir():
            for name in ("AGENTS.md", "AGENTS.MD", "CLAUDE.md", "SKILL.md"):
                candidate = path / name
                key = str(candidate.resolve()).lower()
                if candidate.exists() and key not in seen:
                    targets.append(candidate)
                    seen.add(key)
        elif path.exists():
            key = str(path.resolve()).lower()
            if key not in seen:
                targets.append(path)
                seen.add(key)
    return targets


def words(text: str) -> int:
    return len(re.findall(r"\b\S+\b", text))


def line_words(line: str) -> int:
    return words(line.strip("-*0123456789. "))


def extract_frontmatter(text: str) -> str:
    if not text.startswith("---\n"):
        return ""
    end = text.find("\n---", 4)
    if end == -1:
        return ""
    return text[4:end]


def description_value(frontmatter: str) -> str | None:
    for line in frontmatter.splitlines():
        if line.startswith("description:"):
            value = line.split(":", 1)[1].strip()
            return value.strip("'\"")
    return None


def is_global_claude(path: Path) -> bool:
    try:
        return path.expanduser().resolve() == (Path.home() / ".claude" / "CLAUDE.md").resolve()
    except OSError:
        return False


def audit_wordiness(lines: list[str]) -> int:
    status = 0
    bullet_lengths = [line_words(line) for line in lines if re.match(r"\s*[-*]\s+\S", line)]
    long_bullets = [i + 1 for i, line in enumerate(lines) if re.match(r"\s*[-*]\s+\S", line) and line_words(line) > 22]
    long_paragraphs = [i + 1 for i, line in enumerate(lines) if line.strip() and not line.lstrip().startswith(("#", "-", "*", "|", "`")) and line_words(line) > 28]
    table_lines = [i + 1 for i, line in enumerate(lines) if re.match(r"\s*\|.+\|\s*$", line)]

    if bullet_lengths:
        avg_bullet = sum(bullet_lengths) / len(bullet_lengths)
        print(f"  avg bullet words: {avg_bullet:.1f}")
        if avg_bullet > 16:
            print("  style: bullets are drifting toward prose")
            status = max(status, 1)
    if long_bullets:
        print("  long bullets: lines " + ", ".join(map(str, long_bullets[:8])))
        status = max(status, 1)
    if long_paragraphs:
        print("  long paragraphs: lines " + ", ".join(map(str, long_paragraphs[:8])))
        status = max(status, 1)
    if table_lines:
        print("  markdown table: lines " + ", ".join(map(str, table_lines[:8])) + "; prefer bullets or key: value")
        status = max(status, 1)

    for label, pattern in WORDY_PATTERNS.items():
        matches = [i + 1 for i, line in enumerate(lines) if pattern.search(line)]
        if matches:
            print(f"  possible {label}: lines {', '.join(map(str, matches[:8]))}")
            status = max(status, 1)

    return status


def audit(path: Path) -> int:
    text = path.read_text(errors="replace")
    lines = text.splitlines()
    headings = [line.strip("# ").strip() for line in lines if line.startswith("#")]
    nonblank = [line for line in lines if line.strip()]
    print()
    print(path)
    print(f"  lines: {len(lines)} ({len(nonblank)} nonblank)")
    print(f"  words: {words(text)}")
    print(f"  chars: {len(text)}")

    status = 0
    kind = file_kind(path)
    if kind == "agents.md":
        if len(lines) <= 50:
            print("  size: lean")
        elif len(lines) <= 90:
            print("  size: healthy repo-root range")
        elif len(lines) <= 120:
            print("  size: review band; keep only operational sections")
            status = max(status, 1)
        elif len(lines) <= 150:
            print("  size: split band; move detail into README.md, _AGENT-INSTRUCTIONS/, _TASK-LOG/, _CHANGELOG/, or skills")
            status = max(status, 2)
        else:
            print("  size: exceptional; justify or split by directory")
            status = max(status, 2)

        low_headings = {h.lower() for h in headings}
        weak = sorted(h for h in low_headings if h and h not in GOOD_HEADINGS and len(h.split()) > 1)
        if weak:
            print("  review headings: " + ", ".join(weak[:8]))

        for label, pattern in BLOAT_PATTERNS.items():
            matches = [i + 1 for i, line in enumerate(lines) if pattern.search(line)]
            if matches:
                print(f"  possible {label}: lines {', '.join(map(str, matches[:8]))}")
                status = max(status, 1)

        status = max(status, audit_wordiness(lines))

    if kind == "skill.md":
        frontmatter = extract_frontmatter(text)
        desc = description_value(frontmatter)
        if desc is None:
            print("  skill description: missing")
            status = max(status, 1)
        else:
            desc_words = words(desc)
            print(f"  skill description words: {desc_words}")
            if desc_words > 16:
                print("  skill description: too long; use a trigger phrase, not a summary")
                status = max(status, 1)
            if any(token in desc for token in ("/", "_TASK-LOG", "_CHANGELOG", "_BACKLOG")):
                print("  skill description: contains path/detail; move detail into body")
                status = max(status, 1)

        if len(lines) > 80:
            print("  size: review band for SKILL.md; compress or split references")
            status = max(status, 1)
        if len(lines) > 120:
            print("  size: split band for SKILL.md")
            status = max(status, 2)

        status = max(status, audit_wordiness(lines))

    if kind == "claude.md":
        stripped = [line.strip() for line in lines if line.strip()]
        expected = "@./AGENTS.md"
        if is_global_claude(path):
            if len(stripped) == 1 and stripped[0].startswith("@") and stripped[0].endswith("AGENTS.md"):
                print("  claude bridge: ok global absolute/import bridge")
            else:
                print("  claude bridge: global file should usually be a single @.../AGENTS.md line")
                status = max(status, 1)
        elif len(stripped) == 1 and stripped[0] == expected:
            print("  claude bridge: ok")
        else:
            print("  claude bridge: should be exactly @./AGENTS.md")
            status = max(status, 1)

    return status


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="+", type=Path, help="AGENTS.md, CLAUDE.md, or folders to audit")
    args = parser.parse_args()
    targets = iter_targets(args.paths)
    if not targets:
        parser.error("no AGENTS.md or CLAUDE.md files found")
    status = 0
    for target in targets:
        status = max(status, audit(target))
    return status


if __name__ == "__main__":
    raise SystemExit(main())
