---
name: talkweaver
description: "Use to author or revise TalkWeaver content, convert PowerPoint presentations, make handouts, or turn recordings into Scripts or Notes. Content work, not app development."
---

# TalkWeaver content

Treat the Markdown outline as canonical source. Slides and exported decks are projections; a Pathway selects an alternate ordered cut, and a Run records a delivery. This is an instruction-only skill.

## Search the knowledge stores first

- Before producing new material, search the federated stores you have, such as `talks` (outlines and abstracts), `slide-versions` (every saved slide version), `abstracts-archive` (session abstracts), `learninglog` (lessons and research reports), `highlights` (reading highlights).
- Run: `scout search --hybrid --limit 20 --json "<query>"` (all corpora), or add `--in <corpus>` to restrict. `scout similar <passage-id>` finds neighbours.
- Passage ids look like `<corpus>:<path>:<line>`.
- Reuse a hit by reference: copy it with its passage id or `scout cite` output as provenance. Never retype it without that. Check quotes with `scout verify-quote`.
- Nothing reusable stays only in chat: before your final answer, file every table, visualisation, piece of evidence and search result worth keeping with `scout capture` into the project's `research/` folder, with its sources.
- Command: `scout capture --project <talk folder> --kind <kind> --title "<title>" [--prompt "<question>"] [--source scout:<id>|URL|file:<path>]... [--artefact <file>] --by agent --json -` (body on stdin). Kinds: `evidence`, `table`, `visualisation`, `snippet`, `search`, `widget`.
- Inspect: `scout capture --list --project <talk folder>`; `scout capture --where-used <file>` finds Markdown that mentions a file.

## Research folder

- Every talk has a `research/` folder beside its outline. Each captured unit is one Markdown file (frontmatter: title, kind, prompt, sources, created, project, by) with artefacts beside it.
- File material there, not in the outline, until it is used on a slide.
- App route: palette "Capture to research…" (sheet), "Reveal research folder", agent verb `research.capture` (TalkWeaver 0.42.0-alpha.3+; needs `scout` on the machine). Prefer the verb when exposed; else `scout capture`.
- A folder named `research` (any case) is reserved: never a talk, category, outline or abstract. Creating, renaming, cloning or moving to that name is refused. Never treat its files as talks.
- A Research panel (⌘⇧R) to insert items and make slides from them is locked in design but not yet built. Do not rely on it.

## Establish the task

Locate the user-selected vault, Talk and `*-outline.md`. Read its frontmatter, existing slide IDs, object conventions and relevant manifest before changing it. Classify the request: source revision, Pathway, extraction/conversion, handout, recording transcription, faithful Script cleanup, or rewritten Notes. For app recording work, identify the exact Talk and Run/session before reading its files. Standalone audio transcription needs only the supplied source and output scope; do not require a nonexistent Talk or Run.

Discover actual available app tools or a verified existing CLI. Electron methods such as `talk:write-outline` and compiler functions are not external commands. Do not invent a CLI, install a bridge, launch a development server or change app code to perform content work.

## Choose the content operation

- For SVG figures, interactive HTML widgets and source-linked visual galleries with portable insertion codes, use `talkweaver-visuals` when available.
- For a shorter or differently ordered cut of existing slides, prefer a Pathway. Keep the original outline and slide IDs unchanged.
- For revised ideas or wording, propose precise source edits. Move complete slide blocks with their notes, triggers and assets; do not renumber IDs after a move or title change.
- New content can be prepared as a draft outline. Use existing registered layout/object syntax; do not invent triggers from their English names.
- AI chat or terminal slide (a ChatGPT/Claude-style transcript, an agent session or a shell session shown as a slide; TalkWeaver 0.38.1+; terminals type, chats stream with `stream=on` from 0.38.1-preview.3): use the `{chat}`, `{chat-lanes}`, `{terminal}` or `{terminal-agent}` layouts per [AI chat and terminal slides](references/talkweaver-ai-chat-and-terminal-slides.md). Do not guess the syntax; strip secrets and personal data from transcripts first.
- Follow [outline and Pathway formats](references/content-formats.md). Follow [available surfaces](references/available-surfaces.md) for app operations and validation limits.

## Conversion, handouts and recordings

- [Extraction and conversion](references/talkweaver-extraction-conversion.md): use the existing TalkWeaver PPT Extractor, inspect portable bundles and import-cleanup packs, preserve source evidence, and report extraction or layout gaps.
- [Handout creation](references/talkweaver-handout-creation.md): select the Talk or Run, build the audience reading export through an available app surface, verify its contents, and publish only to an authorised destination.
- [Recording and transcript processing](references/talkweaver-recording-processing.md): locate audio and raw transcripts, use an existing transcription engine, clean the Run's Script or draft Notes in its app-prepared pack.

These workflows use the current app contracts. Older standalone conversion, handout-site and lecture-notes skills may describe different formats; use them only for a matching legacy project or an explicitly requested alternative. Do not create a new website or repair application code to complete an ordinary content request.

## File-only workflow

Read and draft with ordinary file tools. Apply requested edits only within the authorised content scope, against freshly read bytes and with concurrent editor state accounted for. If an open unsaved buffer cannot be ruled out, prepare a separate patch/revision instead of overwriting the live outline or manifest. Preserve unrelated keys and bytes.

Do not edit the slide ledger or manufacture app-save receipts. External edits cannot be described as app-saved, ledgered or undoable without evidence from the app.

## Verify

Check stable IDs, Pathway order, missing references, balanced fences and relative assets. Use a compiler or preview only through an existing verified surface; opening Markdown or running an app build is not a presentation preview. Distinguish source prepared, compiled, visually checked, exported and published. Publication requires authorisation for that destination; a request for a local preview does not provide it.
