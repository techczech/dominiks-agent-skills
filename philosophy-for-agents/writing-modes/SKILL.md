---
name: writing-modes
description: "Use before any prose, to classify the register (FOR AGENTS / FOR DOMINIK / AS DOMINIK), announce it and load its guide. Voice itself is dominik-lukes-voice."
---

# Writing Modes: Classify First

Before writing any prose, decide two things: **who will read the text** and **in whose name it speaks**. Those two answers pick the register. Announce the register, then read its matching register reference. Load the process and source files required by the task as well. Default FOR THE USER.

If `references/local.md` exists, read it: it holds the local conventions for this workspace and overrides this file where they differ.

## The three registers

- **FOR AGENTS** — audience is you or another agent acting on the file (`AGENTS.md`, `SKILL.md`, `TASK.md`, logs, instruction files): `references/for-agents.md`.
- **FOR THE USER** — audience is the person you work for, reading it (`README.md`, explainers, research findings, every chat answer): `references/for-the-user.md`.
- **AS THE USER** — audience is whoever receives text under the user's name (reports, proposals, emails, posts, public pages, slide text): `references/as-the-user.md`. It uses the user's own sources and voice and invents no claims.

## Persist purpose, reader and genre

For substantive prose FOR THE USER or AS THE USER, register selection is the first recorded step. Save a declaration in the established writing workspace before drafting: purpose; who will read; why they are reading; what they already know; what they need to know; what is irrelevant; and the genre's required parts and conventions.

Use a whole-work declaration and a section declaration or brief. When a paragraph or sentence has an unclear purpose, record its job and its relation to the reader's knowledge before rewriting it. Do not create a separate file for every clear sentence.

Read the current declaration and section brief before drafting or reviewing. A handoff names their actual paths and versions; the next agent reads their contents. Preserve the author's current wording, decisions and deletions.

The detailed [purpose/reader declaration](../expository-writing/references/purpose-reader.md) and [file-backed writing process](../expository-writing/references/writing-process.md) define the shared planning, drafting and independent-review stages. Reuse the existing workspace and record each stage's files there. If those companion references are unavailable, retain the declaration fields and explicit input/output handoff above; do not claim to have loaded missing files.

## Why classify first

- Each register has rules that are wrong in the others. Telegraph style is right in an agent file and a failure in a reply to the user; a confident authorial voice is right in a reply and a misrepresentation in a text signed by the user.
- Reading only the matching register guide keeps the other registers' rules out of the draft; it does not exclude shared process instructions or the task's source files.
- The register is decided by **destination, not medium**. A paragraph drafted in chat that the user will paste into their report is AS THE USER. Chat is never FOR AGENTS, even in a turn spent writing agent files.
- Announcing the register makes the choice visible, so the user can correct it before the text is written.

## Adapting the registers to your setup

- **Rename** a register to the name your workspace already uses, for example the user's own name in place of "the user". Rename the reference file with it, or keep the file and change only the label.
- **Add** a register when a real audience falls outside the three, for example text written in the name of a team or organisation rather than one person. Give it its own reference file and one line in the list above, stating who reads it and in whose name it speaks.
- **Point AS THE USER at the user's own voice notes**: a voice guide, style sheet or writing samples. `references/as-the-user.md` says where they load; without them, ask for a source before drafting.
- Put workspace-specific names, paths and preferences in `references/local.md` (and further `references/local-*.md` files if needed), not in the general files.
