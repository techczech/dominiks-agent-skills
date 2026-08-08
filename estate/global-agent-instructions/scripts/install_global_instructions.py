#!/usr/bin/env python3
"""Wire one canonical AGENTS payload into supported user-level agent tools."""

from __future__ import annotations

import argparse
import os
import shutil
import sys
from pathlib import Path


TOOL_TARGETS = {
    "codex": (Path(".codex/AGENTS.md"), "symlink"),
    "claude": (Path(".claude/CLAUDE.md"), "import"),
    "opencode": (Path(".config/opencode/AGENTS.md"), "symlink"),
    "gemini": (Path(".gemini/GEMINI.md"), "symlink"),
    "pi": (Path(".pi/agent/AGENTS.md"), "symlink"),
}


def lexists(path: Path) -> bool:
    return os.path.lexists(path)


def next_backup_path(target: Path) -> Path:
    base = target.with_name(f"{target.name}.pre-global-agent-instructions.bak")
    candidate = base
    counter = 1
    while lexists(candidate):
        candidate = target.with_name(f"{base.name}.{counter}")
        counter += 1
    return candidate


def backup_target(target: Path, dry_run: bool) -> Path:
    backup = next_backup_path(target)
    print(f"BACKUP {target} -> {backup}")
    if dry_run:
        return backup
    if target.is_symlink():
        try:
            resolved = target.resolve(strict=True)
        except OSError as error:
            raise RuntimeError(f"cannot back up broken symlink: {target}") from error
        if not resolved.is_file():
            raise RuntimeError(f"symlink does not resolve to a file: {target}")
        shutil.copy2(resolved, backup)
    elif target.is_file():
        shutil.copy2(target, backup)
    else:
        raise RuntimeError(f"refusing to replace non-file target: {target}")
    return backup


def select_tools(spec: str, home: Path) -> list[str]:
    if spec == "all":
        return list(TOOL_TARGETS)
    if spec == "detected":
        selected = [
            name
            for name, (relative, _) in TOOL_TARGETS.items()
            if (home / relative).parent.is_dir()
        ]
        if not selected:
            raise ValueError(
                "no supported tool directories detected; select tools explicitly"
            )
        return selected
    selected = [item.strip().lower() for item in spec.split(",") if item.strip()]
    unknown = sorted(set(selected) - set(TOOL_TARGETS))
    if unknown:
        raise ValueError(f"unknown tools: {', '.join(unknown)}")
    if not selected:
        raise ValueError("no tools selected")
    return list(dict.fromkeys(selected))


def symlink_is_correct(target: Path, source: Path) -> bool:
    if not target.is_symlink():
        return False
    try:
        return target.resolve(strict=False) == source
    except OSError:
        return False


def canonical_target_location(target: Path) -> Path:
    """Resolve parent-directory aliases without following the target symlink."""
    return target.parent.resolve(strict=False) / target.name


def install_symlink(
    target: Path, source: Path, replace: bool, dry_run: bool
) -> bool:
    if symlink_is_correct(target, source):
        print(f"OK     {target} -> {source}")
        return True
    if lexists(target):
        if not replace:
            print(f"REFUSE {target} exists; inspect it and re-run with --replace")
            return False
        try:
            backup_target(target, dry_run)
        except RuntimeError as error:
            print(f"REFUSE {error}")
            return False
        if not dry_run:
            target.unlink()
    print(f"LINK   {target} -> {source}")
    if not dry_run:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.symlink_to(source)
    return True


def install_claude_import(
    target: Path, source: Path, replace: bool, dry_run: bool
) -> bool:
    import_line = f"@{source}"
    existing = target.read_text(encoding="utf-8") if target.is_file() else ""
    backed_up = False
    if import_line in existing.splitlines():
        print(f"OK     Claude import present in {target}")
        return True
    if target.is_symlink():
        if not replace:
            print(f"REFUSE {target} is a symlink; inspect it and re-run with --replace")
            return False
        try:
            backup_target(target, dry_run)
            backed_up = True
        except RuntimeError as error:
            print(f"REFUSE {error}")
            return False
        if not dry_run:
            target.unlink()
    if existing and not replace:
        print(f"REFUSE {target} has content; inspect it and re-run with --replace")
        return False
    if existing and not backed_up:
        try:
            backup_target(target, dry_run)
        except RuntimeError as error:
            print(f"REFUSE {error}")
            return False
    print(f"IMPORT {import_line} -> {target}")
    if not dry_run:
        target.parent.mkdir(parents=True, exist_ok=True)
        prefix = existing
        if prefix and not prefix.endswith("\n"):
            prefix += "\n"
        target.write_text(f"{prefix}{import_line}\n", encoding="utf-8")
    return True


def install_conflict(target: Path, source: Path, mode: str, replace: bool) -> str | None:
    if mode == "symlink":
        if symlink_is_correct(target, source):
            return None
        if lexists(target) and not replace:
            return "target exists; inspect it and use --replace"
    else:
        import_line = f"@{source}"
        if target.is_file() and import_line in target.read_text(
            encoding="utf-8"
        ).splitlines():
            return None
        if lexists(target) and not replace:
            return "target exists without the managed import; inspect it and use --replace"
    if lexists(target) and not (target.is_file() or target.is_symlink()):
        return "target is not a file or symlink"
    if target.is_symlink() and not target.is_file():
        return "target is a broken symlink"
    return None


def check_target(target: Path, source: Path, mode: str) -> bool:
    if mode == "symlink":
        correct = symlink_is_correct(target, source)
        detail = f"{target} -> {source}"
    else:
        import_line = f"@{source}"
        correct = target.is_file() and import_line in target.read_text(
            encoding="utf-8"
        ).splitlines()
        detail = f"{import_line} in {target}"
    print(f"{'OK' if correct else 'MISS':6} {detail}")
    return correct


def uninstall_target(target: Path, source: Path, mode: str, dry_run: bool) -> bool:
    if mode == "symlink":
        if not symlink_is_correct(target, source):
            print(f"SKIP   {target} is not a managed link to {source}")
            return True
        print(f"REMOVE {target}")
        if not dry_run:
            target.unlink()
        return True

    if not target.is_file() or target.is_symlink():
        print(f"SKIP   no managed Claude import in {target}")
        return True
    import_line = f"@{source}"
    lines = target.read_text(encoding="utf-8").splitlines()
    if import_line not in lines:
        print(f"SKIP   no managed Claude import in {target}")
        return True
    remaining = [line for line in lines if line != import_line]
    print(f"REMOVE {import_line} from {target}")
    if not dry_run:
        if remaining:
            target.write_text("\n".join(remaining) + "\n", encoding="utf-8")
        else:
            target.unlink()
    return True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Install one canonical AGENTS payload across agent tools."
    )
    parser.add_argument("--source", required=True, help="Canonical AGENTS payload")
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--install", action="store_true")
    action.add_argument("--check", action="store_true")
    action.add_argument("--uninstall", action="store_true")
    parser.add_argument(
        "--tools",
        default="detected",
        help="detected, all, or comma-separated: codex,claude,opencode,gemini,pi",
    )
    parser.add_argument(
        "--home", default=str(Path.home()), help="Home directory; useful for testing"
    )
    parser.add_argument(
        "--gemini-target",
        default=".gemini/GEMINI.md",
        help="Gemini context path relative to --home",
    )
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Back up and replace existing targets or modify existing CLAUDE.md",
    )
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source = Path(args.source).expanduser().resolve()
    home = Path(args.home).expanduser().resolve()
    if not source.is_file():
        print(f"ERROR source is not a file: {source}", file=sys.stderr)
        return 2
    try:
        tools = select_tools(args.tools, home)
    except ValueError as error:
        print(f"ERROR {error}", file=sys.stderr)
        return 2
    gemini_target = Path(args.gemini_target)
    if gemini_target.is_absolute() or ".." in gemini_target.parts:
        print("ERROR --gemini-target must be a path below --home", file=sys.stderr)
        return 2
    if "claude" in tools and any(character.isspace() for character in str(source)):
        print(
            "ERROR Claude import paths must not contain whitespace; move the source",
            file=sys.stderr,
        )
        return 2

    action = "install" if args.install else "check" if args.check else "uninstall"
    print(f"ACTION {action}{' (dry run)' if args.dry_run else ''}")
    print(f"SOURCE {source}")
    targets: list[tuple[str, Path, str]] = []
    for tool in tools:
        relative, mode = TOOL_TARGETS[tool]
        if tool == "gemini":
            relative = gemini_target
        targets.append((tool, home / relative, mode))

    source_aliases = [
        tool
        for tool, target, _ in targets
        if canonical_target_location(target) == source
    ]
    if source_aliases:
        print(
            f"ERROR target equals canonical source for: {', '.join(source_aliases)}",
            file=sys.stderr,
        )
        return 2
    target_owners: dict[Path, list[str]] = {}
    for tool, target, _ in targets:
        target_owners.setdefault(canonical_target_location(target), []).append(tool)
    duplicate_targets = {
        target: owners for target, owners in target_owners.items() if len(owners) > 1
    }
    if duplicate_targets:
        for target, owners in duplicate_targets.items():
            print(
                f"ERROR duplicate target {target}: {', '.join(owners)}",
                file=sys.stderr,
            )
        return 2

    if args.install:
        conflicts = [
            (tool, target, reason)
            for tool, target, mode in targets
            if (reason := install_conflict(target, source, mode, args.replace))
        ]
        if conflicts:
            for tool, target, reason in conflicts:
                print(f"REFUSE {tool}: {target}: {reason}")
            print("NO CHANGES: resolve every refusal before installing")
            return 1

    success = True
    for tool, target, mode in targets:
        print(f"TOOL   {tool}")
        if args.check:
            success = check_target(target, source, mode) and success
        elif args.uninstall:
            success = uninstall_target(target, source, mode, args.dry_run) and success
        elif mode == "symlink":
            success = (
                install_symlink(target, source, args.replace, args.dry_run)
                and success
            )
        else:
            success = (
                install_claude_import(target, source, args.replace, args.dry_run)
                and success
            )
    return 0 if success else 1


if __name__ == "__main__":
    raise SystemExit(main())
