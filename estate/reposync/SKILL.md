---
name: reposync
description: Use when inspecting RepoSync repository or fleet state, checkpointing authorised work, checking sync blockers, planning carry rules, or operating its existing CLI. Applies to repository operations, not changes to RepoSync application code.
---

# RepoSync operations

Use the installed RepoSync CLI and its existing policy. This skill adds no commands or configuration and does not modify the application.

## Inspect first

Run `reposync --version` and `reposync --help`; inspect the relevant subcommand's `--help`. Older READMEs describe retired commands and paths. This reference was checked against CLI 0.13.0; actual help and supported schemas take precedence.

Establish the selected repository/Unit path, configured repositories root, canonical machine ID and requested scope. A Unit is a managed path; a Bucket groups Units; carry rules describe intended copies. Local scan results and timestamped peer reports describe observed reality. A downloaded old report is still old.

Use [command reference](references/commands.md) for inspection and mutations, and [checkpoint semantics](references/checkpoints.md) before saving work.

## Choose the smallest existing operation

- Diagnose with `status`, `doctor`, cached `diff`, or a desktop snapshot. Status writes scan/cache data; `--fetch` also contacts remotes.
- For a selected sync, use `reposync sync --path` with the verified path relative to the repositories root. The unscoped command can affect many repositories.
- For a requested checkpoint, inspect its whole-repository scope first. It stages all changes and may push; it is not a local-only or selected-file save command.
- For placement/storage work, inspect `plan` and supported dry runs before `get`, `fill`, carry edits or eviction. Diagnostic requests do not authorise those mutations.
- Preserve policy and sync ownership. Do not hand-edit caches to make the board look healthy, fabricate peer reports, bypass leak gates, force-push or repair application code.

## Report what happened

Separate local file state, local commit, source push, machine-report upload and peer freshness. A `Committed` checkpoint outcome does not prove push success. A successful report pull does not prove another machine scanned or received a commit.

Report exact blockers and supported next actions. If the installed command cannot satisfy a constraint such as local-only saving, state that limitation; do not invent flags or silently widen the operation. Use another established workflow only when the repository's owner and user authorisation permit it.
