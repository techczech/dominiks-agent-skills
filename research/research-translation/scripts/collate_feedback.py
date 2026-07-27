#!/usr/bin/env python3
"""Collate returned translation-review feedback from CSV and JSON files."""

from __future__ import annotations

import argparse
import csv
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


FIELDNAMES = [
    "source_file",
    "reviewer_code",
    "language",
    "material",
    "unit_id",
    "section_or_item",
    "translation_label",
    "score",
    "issue_type",
    "quote",
    "comment",
    "suggested_change",
    "reviewer_confidence",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Collate returned reviewer feedback into CSV, JSON, and Markdown summaries."
    )
    parser.add_argument("--project-dir", required=True, help="Translation project workspace.")
    parser.add_argument(
        "--input-dir",
        help="Folder containing returned feedback. Defaults to feedback/returned.",
    )
    parser.add_argument(
        "--out-dir",
        help="Output folder. Defaults to feedback/collated/<timestamp>.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    project_dir = Path(args.project_dir).expanduser().resolve()
    input_dir = (
        Path(args.input_dir).expanduser().resolve()
        if args.input_dir
        else project_dir / "feedback" / "returned"
    )
    if not input_dir.exists():
        raise SystemExit(f"Feedback input folder not found: {input_dir}")

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_dir = (
        Path(args.out_dir).expanduser().resolve()
        if args.out_dir
        else project_dir / "feedback" / "collated" / timestamp
    )
    out_dir.mkdir(parents=True, exist_ok=True)

    rows = load_feedback_rows(input_dir)
    write_csv(out_dir / "feedback-collated.csv", rows)
    write_json(out_dir / "feedback-collated.json", rows)
    write_markdown(out_dir / "feedback-summary.md", rows, input_dir)
    print(out_dir)
    return 0


def load_feedback_rows(input_dir: Path) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for path in sorted(input_dir.rglob("*")):
        if path.is_dir():
            continue
        if path.suffix.lower() == ".csv":
            rows.extend(load_csv(path))
        elif path.suffix.lower() == ".json":
            rows.extend(load_json_feedback(path))
    return rows


def load_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        return [normalise_row(row, path) for row in reader if any((value or "").strip() for value in row.values())]


def load_json_feedback(path: Path) -> list[dict[str, str]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, list):
        return [normalise_row(item, path) for item in data if isinstance(item, dict)]
    if isinstance(data, dict):
        if isinstance(data.get("feedback"), list):
            return [normalise_row(item, path, data) for item in data["feedback"] if isinstance(item, dict)]
        if isinstance(data.get("rows"), list):
            return [normalise_row(item, path, data) for item in data["rows"] if isinstance(item, dict)]
        return flatten_review_export(data, path)
    return []


def flatten_review_export(data: dict[str, Any], path: Path) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    reviewer_code = str(data.get("reviewer_code") or data.get("reviewerCode") or "")
    language = str(data.get("language") or "")
    materials = data.get("materials") or []
    feedback = data.get("feedback") or {}
    if not isinstance(materials, list) or not isinstance(feedback, dict):
        return rows
    for material in materials:
        if not isinstance(material, dict):
            continue
        material_label = str(material.get("label") or material.get("id") or "")
        for unit in material.get("units") or []:
            if not isinstance(unit, dict):
                continue
            unit_id = str(unit.get("id") or "")
            unit_feedback = feedback.get(unit_id) if isinstance(feedback, dict) else {}
            if not isinstance(unit_feedback, dict):
                unit_feedback = {}
            for arm in unit.get("arms") or []:
                if not isinstance(arm, dict):
                    continue
                label = str(arm.get("label") or "")
                arm_feedback = (unit_feedback.get("arms") or {}).get(label) if isinstance(unit_feedback.get("arms"), dict) else {}
                if not isinstance(arm_feedback, dict):
                    arm_feedback = {}
                comment = str(arm_feedback.get("comment") or "")
                score = arm_feedback.get("score") or arm_feedback.get("overall")
                rows.append(
                    normalise_row(
                        {
                            "reviewer_code": reviewer_code,
                            "language": language,
                            "material": material_label,
                            "unit_id": unit_id,
                            "section_or_item": unit.get("heading") or "",
                            "translation_label": label,
                            "score": score or "",
                            "comment": comment,
                        },
                        path,
                    )
                )
                for note in arm_feedback.get("phraseComments") or []:
                    if isinstance(note, dict):
                        rows.append(
                            normalise_row(
                                {
                                    "reviewer_code": reviewer_code,
                                    "language": language,
                                    "material": material_label,
                                    "unit_id": unit_id,
                                    "section_or_item": unit.get("heading") or "",
                                    "translation_label": label,
                                    "issue_type": "phrase",
                                    "quote": note.get("quote") or "",
                                    "comment": note.get("note") or "",
                                },
                                path,
                            )
                        )
    return rows


def normalise_row(
    row: dict[str, Any],
    path: Path,
    parent: dict[str, Any] | None = None,
) -> dict[str, str]:
    parent = parent or {}
    aliases = {
        "reviewer_code": ["reviewer_code", "reviewerCode", "reviewer", "reviewer_id"],
        "section_or_item": ["section_or_item", "section", "item", "heading", "unit_heading"],
        "translation_label": ["translation_label", "translation", "arm", "label"],
        "suggested_change": ["suggested_change", "suggestion", "suggested_revision"],
        "reviewer_confidence": ["reviewer_confidence", "confidence"],
    }
    normalised: dict[str, str] = {"source_file": str(path)}
    for field in FIELDNAMES:
        if field == "source_file":
            continue
        value = pick_value(row, aliases.get(field, [field]))
        if value == "":
            value = pick_value(parent, aliases.get(field, [field]))
        normalised[field] = stringify(value)
    return normalised


def pick_value(row: dict[str, Any], keys: list[str]) -> Any:
    for key in keys:
        if key in row and row[key] not in (None, ""):
            return row[key]
    return ""


def stringify(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, sort_keys=True)
    return str(value)


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)


def write_json(path: Path, rows: list[dict[str, str]]) -> None:
    path.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_markdown(path: Path, rows: list[dict[str, str]], input_dir: Path) -> None:
    by_language = Counter(row["language"] or "not specified" for row in rows)
    by_material = Counter(row["material"] or "not specified" for row in rows)
    by_issue = Counter(row["issue_type"] or "not specified" for row in rows)
    comments_by_unit: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        if row.get("comment") or row.get("quote") or row.get("suggested_change"):
            key = " | ".join(
                [
                    row.get("language") or "not specified",
                    row.get("material") or "not specified",
                    row.get("unit_id") or row.get("section_or_item") or "not specified",
                ]
            )
            comments_by_unit[key].append(row)

    lines = [
        "# Feedback summary",
        "",
        f"- Input folder: `{input_dir}`",
        f"- Rows collated: {len(rows)}",
        "",
        "## By language",
        "",
        *counter_lines(by_language),
        "",
        "## By material",
        "",
        *counter_lines(by_material),
        "",
        "## By issue type",
        "",
        *counter_lines(by_issue),
        "",
        "## Comments by unit",
        "",
    ]
    if not comments_by_unit:
        lines.append("No free-text comments found.")
    else:
        for unit, unit_rows in sorted(comments_by_unit.items()):
            lines.extend([f"### {unit}", ""])
            for row in unit_rows:
                prefix = f"- {row.get('translation_label') or 'translation not specified'}"
                detail = row.get("comment") or row.get("suggested_change") or ""
                quote = f" Quote: {row['quote']}" if row.get("quote") else ""
                lines.append(f"{prefix}: {detail}{quote}")
            lines.append("")
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def counter_lines(counter: Counter[str]) -> list[str]:
    if not counter:
        return ["- None"]
    return [f"- {key}: {value}" for key, value in sorted(counter.items())]


if __name__ == "__main__":
    raise SystemExit(main())
