---
name: writeflex
description: "Use when reading, organising or reviewing Markdown content, Collections and Folios for WriteFlex. Content work, not app development."
---

# WriteFlex content

Work on the writer's content using WriteFlex's document model. This skill supplies instructions; it installs no app, CLI, bridge or runtime.

## Search the knowledge stores first

- Before producing new material, search the federated stores you have, such as `writing` (the owner's posts and essays), `learninglog` (lessons and research reports), `highlights` (reading highlights), `talks` (presentation outlines and abstracts).
- Run: `scout search --hybrid --limit 20 --json "<query>"` (all corpora), or add `--in <corpus>` to restrict. `scout similar <passage-id>` finds neighbours.
- Passage ids look like `<corpus>:<path>:<line>`.
- Reuse a hit by reference: copy it with its passage id or `scout cite` output as provenance. Never retype it without that. Check quotes with `scout verify-quote`.
- Nothing reusable stays only in chat: before your final answer, file every table, visualisation, piece of evidence and search result worth keeping with `scout capture` into the project's `research/` folder, with its sources.
- Command: `scout capture --project <folder> --kind <kind> --title "<title>" [--prompt "<question>"] [--source scout:<id>|URL|file:<path>]... [--artefact <file>] --by agent --json -` (body on stdin). Kinds: `evidence`, `table`, `visualisation`, `snippet`, `search`, `widget`.
- Inspect: `scout capture --list --project <folder>`; `scout capture --where-used <file>`.
- Every piece or Folio has a `research/` folder beside it; one Markdown file per unit (frontmatter: title, kind, prompt, sources, created, project, by), artefacts beside it. File material there, not in the prose. Captures may sit in subfolders of `research/` (`scout capture --into <sub>`); after moving one, run `scout capture --moved <old> <new>`; see content formats, Folio folders.
- App route (WriteFlex 0.26.0-alpha.9+): palette "Capture to research…", agent verb `research.capture`, CLI `writeflex capture`; all run `scout capture`. A shared Research panel (⌘⇧R: insert at cursor, used-in, search scopes) is locked in design but not yet built.

## Establish the working surface

Identify the requested Workspace and files from the user or available app context. A Workspace is a folder; a Collection is an ordinary folder. A folder is a Folio when it has `_report-structure.json`, or an Index Note `_<folder>_INDEX.md` with a `## Running order` list. `.folio-backup.json` alone and numbered filenames do not make one.

Use only app tools actually exposed in the current session or an existing CLI whose help confirms the operation. Names such as `prose.edit` are capability identifiers, not shell commands. Do not add an endpoint, wrapper or app-code change to complete content work.

With file access alone, read content and prepare reviewable edits or new drafts in the requested destination. Respect explicit authorisation to apply file edits, but first establish that another editor is not holding unsaved changes. If that cannot be established, produce a separate proposal and report that the original remains unchanged. Never claim a file edit entered Bridle proposals, history or undo.

## Work with the content

- Preserve YAML metadata, links, citations, assets and comment syntax outside the requested change. Keep substantive prose changes small and independently reviewable.
- Keep active document filenames canonical and stable, such as `section-results.md`. Put draft dates, versions and update history in metadata, not date, version, `revised` or `updated` filename suffixes. Dated or versioned names belong in `offcuts/` or `archive/`; follow the [canonical file guidance](references/content-formats.md#canonical-active-files) when promoting a revision.
- Use the writer's declared order for a Folio. Preserve unknown manifest fields; never replace a malformed existing manifest as though absent.
- A Folio opens in WriteFlex as one workspace (Outline, Text, Cards, Map, Flags, Evidence, Files tabs). Its plan-line fields, flags, evidence-and-notes file, map canvas and Folio bin are in the content formats reference.
- Never delete a Folio file or touch `.folio-bin/`; take a part out by removing its running-order and manifest entries.
- Reorganising a Folio (folders, moves, move map, nested Folios, exports, backups): follow the Folio folders and moves sections of the content formats reference. Never hand-write the AGENTS.md block.
- Keep content and presentation separate. Do not edit compiled exports to change their source.
- Treat `//` lines outside code as writer annotations; do not turn them into published prose. Inside code, `//` remains code.
- Follow [content formats](references/content-formats.md) for Folios, tables, comments, widgets and exports.
- Follow [existing app operations](references/app-operations.md) only when those operations are actually available.

## Verify and report

Re-read changed artefacts; check the exact diff, manifest paths/order and link targets. A stale baseline requires a fresh read, not a whole-file replacement. Keep `.bridle` and other app-managed history untouched.

Distinguish a prepared proposal, a written file, an accepted app change and a rendered/exported result. Report only the states observed. If rendering is unavailable, say the content is prepared but its app rendering is unverified.
