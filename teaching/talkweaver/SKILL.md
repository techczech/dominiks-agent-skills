---
name: talkweaver
description: Use when authoring, revising or inspecting TalkWeaver outlines, slides, Pathways and Run-related content, or preparing a local presentation. Applies to presentation content, not development of the TalkWeaver application.
---

# TalkWeaver content

Treat the Markdown outline as canonical source. Slides and exported decks are projections; a Pathway selects an alternate ordered cut, and a Run records a delivery. This is an instruction-only skill.

## Establish the task

Locate the user-selected vault, Talk and `*-outline.md`. Read its frontmatter, existing slide IDs, object conventions and relevant manifest before changing it. Determine whether the request needs source revision, a Pathway, preparation for a Run, or an export.

Discover actual available app tools or a verified existing CLI. Electron methods such as `talk:write-outline` and compiler functions are not external commands. Do not invent a CLI, install a bridge, launch a development server or change app code to perform content work.

## Choose the content operation

- For a shorter or differently ordered cut of existing slides, prefer a Pathway. Keep the original outline and slide IDs unchanged.
- For revised ideas or wording, propose precise source edits. Move complete slide blocks with their notes, triggers and assets; do not renumber IDs after a move or title change.
- New content can be prepared as a draft outline. Use existing registered layout/object syntax; do not invent triggers from their English names.
- Follow [outline and Pathway formats](references/content-formats.md). Follow [available surfaces](references/available-surfaces.md) for app operations and validation limits.

## File-only workflow

Read and draft with ordinary file tools. Apply requested edits only within the authorised content scope, against freshly read bytes and with concurrent editor state accounted for. If an open unsaved buffer cannot be ruled out, prepare a separate patch/revision instead of overwriting the live outline or manifest. Preserve unrelated keys and bytes.

Do not edit the slide ledger or manufacture app-save receipts. External edits cannot be described as app-saved, ledgered or undoable without evidence from the app.

## Verify

Check stable IDs, Pathway order, missing references, balanced fences and relative assets. Use a compiler or preview only through an existing verified surface; opening Markdown or running an app build is not a presentation preview. Distinguish source prepared, compiled, visually checked, exported and published. Publication requires authorisation for that destination; a request for a local preview does not provide it.
