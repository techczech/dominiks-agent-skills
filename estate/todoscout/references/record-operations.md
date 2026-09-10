# Existing Action Item record CLI

Some TodoScout installations provide `scripts/action_items.py` in their configured record-layer project. It is not bundled by this skill. Locate that project and its data root from the installation's settings or workspace instructions. The project root used as the command working directory is different from the record data root supplied to `--root`.

Use the project's established Python environment. Where it already uses uv, the verified command form is:

```sh
uv run python scripts/action_items.py --help
uv run python scripts/action_items.py --root "/absolute/record-data-root" list --view today --format json
```

Run from the verified record-layer project. Root and `--mock-data` are global options and come before the subcommand. Do not assume `--mock-data` redirects a live root; use an explicitly isolated fixture root and follow its validation.

| Operation | Existing form after global options |
| --- | --- |
| View tasks | `list --view today --format json`; other views are `week` and `new-info`. |
| Validate records | `validate` |
| Update one task | `update ITEM_ID --status waiting` |
| Change a next step | `update ITEM_ID --next-step "A verified next step"` |
| Update dates/priority | `update ITEM_ID --due-date VALUE`, `--review-date VALUE`, or `--priority VALUE`; use actual values and meanings supported by the store. |
| Refresh a dossier | `dossier build ITEM_ID` (writes; not a read operation). |
| Append a dossier note | `dossier note ITEM_ID --section "Triage Notes" --note "..."` |
| Prepare a launch description | `dossier launch-preview ITEM_ID` (does not launch an agent). |
| Rebuild indexes | `index rebuild` |

Other permitted dossier note sections are `Context Gaps` and `Activity Log`. An exact note removal command exists as `dossier undo-note`; it requires matching section, text and timestamp. Inspect its help and target before use. It is not a generic task rollback command.

An authorised status-update sequence is: read the identified item; run `update`; run `validate` and `index rebuild`; read the resulting item and appropriate view. The app's current UI status writer follows update with index rebuilding; an external caller needs to complete that step too. If validation fails after a write, report partial completion and the issue; do not report an unchanged record or silently roll back later edits.

The updater preserves record identity, changes requested state fields, sets an update timestamp and appends a log entry. Manual YAML changes bypass this behaviour. Do not edit generated JSON indexes to make a view appear correct.
