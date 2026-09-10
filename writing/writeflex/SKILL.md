---
name: writeflex
description: Use when reading, organising, reviewing or preparing Markdown content, Collections and Folios for WriteFlex. Applies to content work and existing exposed app tools, not development of the WriteFlex application.
---

# WriteFlex content

Work on the writer's content using WriteFlex's document model. This skill supplies instructions; it installs no app, CLI, bridge or runtime.

## Establish the working surface

Identify the requested Workspace and files from the user or available app context. A Workspace is a folder; a Collection is an ordinary folder; a Folio is a folder explicitly declared by `_report-structure.json`. Numbered filenames alone do not make a Folio.

Use only app tools actually exposed in the current session or an existing CLI whose help confirms the operation. Names such as `prose.edit` are capability identifiers, not shell commands. Do not add an endpoint, wrapper or app-code change to complete content work.

With file access alone, read content and prepare reviewable edits or new drafts in the requested destination. Respect explicit authorisation to apply file edits, but first establish that another editor is not holding unsaved changes. If that cannot be established, produce a separate proposal and report that the original remains unchanged. Never claim a file edit entered Bridle proposals, history or undo.

## Work with the content

- Preserve YAML metadata, links, citations, assets and comment syntax outside the requested change. Keep substantive prose changes small and independently reviewable.
- Use the writer's declared order for a Folio. Preserve unknown manifest fields; never replace a malformed existing manifest as though absent.
- Keep content and presentation separate. Do not edit compiled exports to change their source.
- Treat `//` lines outside code as writer annotations; do not turn them into published prose. Inside code, `//` remains code.
- Follow [content formats](references/content-formats.md) for Folios, tables, comments and exports.
- Follow [existing app operations](references/app-operations.md) only when those operations are actually available.

## Verify and report

Re-read changed artefacts; check the exact diff, manifest paths/order and link targets. A stale baseline requires a fresh read, not a whole-file replacement. Keep `.bridle` and other app-managed history untouched.

Distinguish a prepared proposal, a written file, an accepted app change and a rendered/exported result. Report only the states observed. If rendering is unavailable, say the content is prepared but its app rendering is unverified.
