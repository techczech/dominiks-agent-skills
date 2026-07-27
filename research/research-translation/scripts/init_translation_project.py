#!/usr/bin/env python3
"""Create a local research translation project folder from the bundled template."""

from __future__ import annotations

import argparse
import shutil
from datetime import datetime, timezone
from pathlib import Path


TEXT_SUFFIXES = {
    ".md",
    ".txt",
    ".yaml",
    ".yml",
    ".json",
    ".toml",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create an auditable research translation project folder."
    )
    parser.add_argument("--project-dir", required=True, help="Folder to create or populate.")
    parser.add_argument("--project-name", help="Human-readable project name.")
    parser.add_argument("--source-language", default="English")
    parser.add_argument(
        "--target-language",
        action="append",
        default=[],
        help="Target language. Repeat for multiple languages.",
    )
    parser.add_argument(
        "--mode",
        choices=["agent-assisted", "codex-assisted", "api-assisted", "manual-review"],
        default="agent-assisted",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Allow writing into an existing non-empty folder.",
    )
    return parser.parse_args()


def render_text(text: str, replacements: dict[str, str]) -> str:
    for key, value in replacements.items():
        text = text.replace("{{" + key + "}}", value)
    return text


def copy_template(template_dir: Path, project_dir: Path, replacements: dict[str, str]) -> None:
    for source in template_dir.rglob("*"):
        relative = source.relative_to(template_dir)
        target = project_dir / relative

        if source.is_dir():
            target.mkdir(parents=True, exist_ok=True)
            continue

        target.parent.mkdir(parents=True, exist_ok=True)
        if source.suffix.lower() in TEXT_SUFFIXES:
            target.write_text(
                render_text(source.read_text(encoding="utf-8"), replacements),
                encoding="utf-8",
            )
        else:
            shutil.copy2(source, target)


def main() -> int:
    args = parse_args()
    project_dir = Path(args.project_dir).expanduser().resolve()
    project_name = args.project_name or project_dir.name.replace("-", " ").replace("_", " ")
    target_languages = args.target_language or ["TO-DECIDE"]

    if project_dir.exists() and any(project_dir.iterdir()) and not args.force:
        raise SystemExit(
            f"{project_dir} already exists and is not empty. Use --force to merge the template."
        )

    skill_root = Path(__file__).resolve().parents[1]
    template_dir = skill_root / "assets" / "project-template"
    if not template_dir.exists():
        raise SystemExit(f"Template folder not found: {template_dir}")

    replacements = {
        "PROJECT_NAME": project_name,
        "SOURCE_LANGUAGE": args.source_language,
        "TARGET_LANGUAGES": ", ".join(target_languages),
        "TARGET_LANGUAGES_YAML": "\n".join(f"  - {lang}" for lang in target_languages),
        "MODE": "agent-assisted" if args.mode == "codex-assisted" else args.mode,
        "CREATED_AT": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }

    project_dir.mkdir(parents=True, exist_ok=True)
    copy_template(template_dir, project_dir, replacements)
    print(f"Created research translation project: {project_dir}")
    print("Next: add source files to source-documents/ and review config/provider-consent.example.yaml.")
    print("Feedback folders are available under feedback/outgoing, feedback/returned, and feedback/collated.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
