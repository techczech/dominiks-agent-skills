#!/usr/bin/env python3
"""Prepare a reviewer feedback request folder for a translation project."""

from __future__ import annotations

import argparse
import csv
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_FEEDBACK_FIELDS = [
    "unit_id",
    "language",
    "material",
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
        description="Create a feedback request folder for one reviewer."
    )
    parser.add_argument("--project-dir", required=True, help="Translation project workspace.")
    parser.add_argument("--reviewer-code", required=True, help="Reviewer code or pseudonym.")
    parser.add_argument("--language", action="append", default=[], help="Target language under review. Repeat as needed.")
    parser.add_argument("--material", action="append", default=[], help="Material under review. Repeat as needed.")
    parser.add_argument("--package", action="append", default=[], help="Reviewer package file or folder to copy into the request.")
    parser.add_argument("--due-date", help="Optional due date to include in the request note.")
    parser.add_argument(
        "--out-dir",
        help="Output directory. Defaults to feedback/outgoing/<reviewer-code>-<timestamp>.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    project_dir = Path(args.project_dir).expanduser().resolve()
    if not project_dir.exists():
        raise SystemExit(f"Project directory not found: {project_dir}")

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    reviewer_slug = slugify(args.reviewer_code)
    out_dir = (
        Path(args.out_dir).expanduser().resolve()
        if args.out_dir
        else project_dir / "feedback" / "outgoing" / f"{reviewer_slug}-{timestamp}"
    )
    out_dir.mkdir(parents=True, exist_ok=True)

    copied_packages = copy_packages(args.package, out_dir)
    write_feedback_csv(out_dir / "feedback-form.csv", args.language, args.material)
    write_readme(out_dir / "README.md", args, copied_packages)
    write_manifest(out_dir / "request-manifest.json", args, copied_packages, timestamp)
    print(out_dir)
    return 0


def copy_packages(package_paths: list[str], out_dir: Path) -> list[dict[str, str]]:
    package_dir = out_dir / "review-packages"
    copied: list[dict[str, str]] = []
    for raw_path in package_paths:
        source = Path(raw_path).expanduser().resolve()
        if not source.exists():
            raise SystemExit(f"Package path not found: {source}")
        package_dir.mkdir(parents=True, exist_ok=True)
        target = package_dir / source.name
        if source.is_dir():
            if target.exists():
                raise SystemExit(f"Target already exists: {target}")
            shutil.copytree(source, target)
        else:
            shutil.copy2(source, target)
        copied.append({"source": str(source), "copy": str(target)})
    return copied


def write_feedback_csv(path: Path, languages: list[str], materials: list[str]) -> None:
    language_values = languages or [""]
    material_values = materials or [""]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=DEFAULT_FEEDBACK_FIELDS)
        writer.writeheader()
        for language in language_values:
            for material in material_values:
                writer.writerow(
                    {
                        "language": language,
                        "material": material,
                        "issue_type": "meaning / fluency / terminology / tone / formatting",
                    }
                )


def write_readme(path: Path, args: argparse.Namespace, copied_packages: list[dict[str, str]]) -> None:
    due_line = f"- Due date: {args.due_date}\n" if args.due_date else ""
    package_lines = "\n".join(
        f"- `review-packages/{Path(item['copy']).name}`" for item in copied_packages
    ) or "- No package files copied. Attach or share the review package separately."
    path.write_text(
        "# Translation feedback request\n\n"
        f"- Reviewer code: `{args.reviewer_code}`\n"
        f"{due_line}"
        f"- Languages: {', '.join(args.language) if args.language else 'not specified'}\n"
        f"- Materials: {', '.join(args.material) if args.material else 'not specified'}\n\n"
        "## Review package files\n\n"
        f"{package_lines}\n\n"
        "## Feedback form\n\n"
        "Use `feedback-form.csv` for structured comments. Add one row per issue, phrase, section, or item.\n\n"
        "Do not include private clinical information or participant-identifying information in feedback files.\n",
        encoding="utf-8",
    )


def write_manifest(
    path: Path,
    args: argparse.Namespace,
    copied_packages: list[dict[str, str]],
    timestamp: str,
) -> None:
    path.write_text(
        json.dumps(
            {
                "created_at": timestamp,
                "reviewer_code": args.reviewer_code,
                "languages": args.language,
                "materials": args.material,
                "due_date": args.due_date,
                "packages": copied_packages,
                "feedback_form": "feedback-form.csv",
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )


def slugify(value: str) -> str:
    allowed = []
    for char in value.lower().strip():
        if char.isalnum():
            allowed.append(char)
        elif char in {" ", "-", "_"}:
            allowed.append("-")
    slug = "".join(allowed).strip("-")
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug or "reviewer"


if __name__ == "__main__":
    raise SystemExit(main())
