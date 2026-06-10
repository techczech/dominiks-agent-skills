#!/usr/bin/env python3
"""Import tickets from a structured markdown backlog into changelog/backlog.

Usage:
  import_backlog.py --source path/to/backlog.md [--changelog-dir path]
                    [--date YYYY-MM-DD] [--status STATUS]
                    [--phase-date YYYY-MM-DD] [--artifact PATH_OR_URL]
                    [--ticket-id-dir path]

The importer expects a markdown document with sections shaped like:

  ## Phase 0: Foundations and Trust Model
  #### Ticket 0.1. Confirm prototype trust boundaries
  Goal:
  ...
  Scope:
  ...
  Acceptance criteria:
  ...
  Dependencies:
  - 0.1
  Notes:
  ...

If `--ticket-id-dir` is provided, filenames like `T0-1-...md` are used to
preserve existing ticket IDs and optionally enrich imported sections.
"""
import argparse
import re
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _common import (  # noqa: E402
    SKILL_DIR,
    find_entry,
    parse_frontmatter,
    resolve_changelog_dir,
    serialize_frontmatter,
    slugify,
)

TICKET_RE = re.compile(r"^####\s+Ticket\s+(\d+)\.(\d+)\.\s+(.+?)\s*$")
PHASE_RE = re.compile(r"^##\s+(Phase\s+\d+:\s+.+?)\s*$")
SECTION_NAMES = {
    "goal": "Goal",
    "scope": "Scope",
    "acceptance criteria": "Acceptance Criteria",
    "dependencies": "Dependencies",
    "notes": "Notes",
    "implementation notes": "Implementation Notes",
}
BACKLOG_STATUSES = ["proposed", "active", "in-progress", "done", "deferred", "dropped"]


def parse_ticket_sections(text):
    sections = {}
    current = None
    for raw_line in text.splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()
        matched = False
        for key, canonical in SECTION_NAMES.items():
            if stripped.lower() == f"{key}:" or stripped.lower() == f"## {key}":
                current = canonical
                sections.setdefault(current, [])
                matched = True
                break
        if matched:
            continue
        if current:
            sections[current].append(line)
    return {k: trim_block(v) for k, v in sections.items() if trim_block(v)}


def trim_block(lines):
    while lines and not lines[0].strip():
        lines = lines[1:]
    while lines and not lines[-1].strip():
        lines = lines[:-1]
    return lines


def parse_backlog_document(text):
    tickets = []
    current_phase = None
    current_ticket = None
    current_lines = []

    def flush_ticket():
        nonlocal current_ticket, current_lines
        if not current_ticket:
            return
        current_ticket["sections"] = parse_ticket_sections("\n".join(current_lines))
        tickets.append(current_ticket)
        current_ticket = None
        current_lines = []

    for raw_line in text.splitlines():
        phase_match = PHASE_RE.match(raw_line)
        if phase_match:
            flush_ticket()
            current_phase = phase_match.group(1)
            continue

        if current_ticket and raw_line.startswith("## "):
            flush_ticket()
            continue

        ticket_match = TICKET_RE.match(raw_line)
        if ticket_match:
            flush_ticket()
            current_ticket = {
                "number": f"{ticket_match.group(1)}.{ticket_match.group(2)}",
                "title": ticket_match.group(3).strip(),
                "phase_title": current_phase,
            }
            continue

        if current_ticket:
            current_lines.append(raw_line)

    flush_ticket()
    return tickets


def load_ticket_id_dir(ticket_id_dir):
    if not ticket_id_dir:
        return {}
    root = Path(ticket_id_dir).resolve()
    mapping = {}
    for path in sorted(root.rglob("*.md")):
        match = re.match(r"^T(\d+)-(\d+)-", path.stem)
        if not match:
            continue
        number = f"{match.group(1)}.{match.group(2)}"
        sections = parse_ticket_sections(path.read_text())
        mapping[number] = {
            "id": path.stem,
            "path": path,
            "sections": sections,
        }
    return mapping


def fallback_ticket_id(number, title):
    number_part = number.replace(".", "-")
    return f"T{number_part}-{slugify(title)}"


def derive_phase_id(phase_title, phase_date):
    return f"{phase_date}-{slugify(phase_title)}"


def parse_dependency_ids(lines, number_to_id):
    if not lines:
        return []
    dependencies = []
    for raw in lines:
        stripped = raw.strip()
        if not stripped:
            continue
        stripped = re.sub(r"^[-*]\s*", "", stripped)
        if stripped.lower() in ("none", "none."):
            continue
        for match in re.findall(r"\b\d+\.\d+\b", stripped):
            dep = number_to_id.get(match)
            if dep and dep not in dependencies:
                dependencies.append(dep)
    return dependencies


def render_body(goal, scope, acceptance, dependencies, notes):
    sections = []
    if goal:
        sections.extend(["## Goal", ""])
        sections.extend(goal)
        sections.append("")
    if scope:
        sections.extend(["## Scope", ""])
        sections.extend(scope)
        sections.append("")
    if acceptance:
        sections.extend(["## Acceptance Criteria", ""])
        sections.extend(acceptance)
        sections.append("")
    if dependencies:
        sections.extend(["## Dependencies", ""])
        for dep in dependencies:
            sections.append(f"- `{dep}`")
        sections.append("")
    if notes:
        sections.extend(["## Implementation Notes", ""])
        sections.extend(notes)
        sections.append("")
    return "\n".join(sections).rstrip() + "\n"


def ensure_phase_exists(cdir, phase_id):
    return bool(find_entry(cdir / "phases", phase_id))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True)
    parser.add_argument("--changelog-dir")
    parser.add_argument("--date", default=date.today().isoformat())
    parser.add_argument("--status", default="proposed", choices=BACKLOG_STATUSES)
    parser.add_argument("--phase-date")
    parser.add_argument("--artifact", action="append", default=[])
    parser.add_argument("--ticket-id-dir")
    args = parser.parse_args()

    cdir = resolve_changelog_dir(args.changelog_dir)
    backlog_dir = cdir / "backlog"
    backlog_dir.mkdir(parents=True, exist_ok=True)

    source_path = Path(args.source).resolve()
    ticket_id_map = load_ticket_id_dir(args.ticket_id_dir)
    source_tickets = parse_backlog_document(source_path.read_text())
    if not source_tickets:
        sys.exit(f"error: no tickets found in {source_path}")

    number_to_id = {}
    for ticket in source_tickets:
        mapped = ticket_id_map.get(ticket["number"])
        if mapped:
            number_to_id[ticket["number"]] = mapped["id"]
        else:
            number_to_id[ticket["number"]] = fallback_ticket_id(
                ticket["number"], ticket["title"]
            )

    created = []
    phase_date = args.phase_date or args.date
    template = (SKILL_DIR / "assets" / "templates" / "backlog.md").read_text()

    for ticket in source_tickets:
        ticket_id = number_to_id[ticket["number"]]
        target = backlog_dir / f"{ticket_id}.md"
        if target.exists():
            sys.exit(f"error: {target} already exists")

        enriched = ticket_id_map.get(ticket["number"], {})
        enriched_sections = enriched.get("sections", {})
        source_sections = ticket.get("sections", {})
        goal = enriched_sections.get("Goal") or source_sections.get("Goal") or []
        scope = enriched_sections.get("Scope") or source_sections.get("Scope") or []
        acceptance = (
            enriched_sections.get("Acceptance Criteria")
            or source_sections.get("Acceptance Criteria")
            or []
        )
        notes = (
            enriched_sections.get("Notes")
            or enriched_sections.get("Implementation Notes")
            or source_sections.get("Notes")
            or source_sections.get("Implementation Notes")
            or []
        )
        dependencies = parse_dependency_ids(
            source_sections.get("Dependencies", []), number_to_id
        )

        artifacts = list(args.artifact)
        try:
            rel_source = source_path.relative_to(cdir.parent)
            rel_source_str = str(rel_source)
        except ValueError:
            rel_source_str = str(source_path)
        artifact_basenames = {Path(x).name for x in artifacts}
        if rel_source_str not in artifacts and Path(rel_source_str).name not in artifact_basenames:
            artifacts.append(rel_source_str)

        refs = {}
        phase_title = ticket.get("phase_title")
        if phase_title:
            phase_id = derive_phase_id(phase_title, phase_date)
            refs["part_of"] = [phase_id]
            if not ensure_phase_exists(cdir, phase_id):
                print(
                    f"warning: phase entry {phase_id!r} not found; backlog item will "
                    f"still reference it",
                    file=sys.stderr,
                )

        content = (
            template.replace("{{TITLE}}", ticket["title"])
            .replace("{{ID}}", ticket_id)
            .replace("{{DATE}}", args.date)
        )
        meta, _ = parse_frontmatter(content)
        meta["status"] = args.status
        meta["updated"] = args.date
        if dependencies:
            meta["depends_on"] = dependencies
        if artifacts:
            meta["artifacts"] = artifacts
        if refs:
            meta["refs"] = refs

        body = render_body(goal, scope, acceptance, dependencies, notes)
        target.write_text(serialize_frontmatter(meta) + "\n" + body)
        created.append(target)

    for path in created:
        print(path)


if __name__ == "__main__":
    main()
