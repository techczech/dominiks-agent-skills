---
name: writing-modes
description: Classify the writing register before any prose — FOR AGENTS / FOR THE USER / AS THE USER — by deciding who the text is for and in whose name it speaks, announce it, then read only the matching reference file.
---

# Writing Modes: Classify First

Before writing any prose, decide two things: **who will read the text** and **in whose name it speaks**. Those two answers pick the register. Announce the register, then read only that one reference file. Default FOR THE USER.

If `references/local.md` exists, read it: it holds the local conventions for this workspace and overrides this file where they differ.

## The three registers

- **FOR AGENTS** — audience is you or another agent acting on the file (`AGENTS.md`, `SKILL.md`, `TASK.md`, logs, instruction files): `references/for-agents.md`.
- **FOR THE USER** — audience is the person you work for, reading it (`README.md`, explainers, research findings, every chat answer): `references/for-the-user.md`.
- **AS THE USER** — audience is whoever receives text under the user's name (reports, proposals, emails, posts, public pages, slide text): `references/as-the-user.md`. It uses the user's own sources and voice and invents no claims.

## Why classify first

- Each register has rules that are wrong in the others. Telegraph style is right in an agent file and a failure in a reply to the user; a confident authorial voice is right in a reply and a misrepresentation in a text signed by the user.
- Reading only the matching reference keeps the other registers' rules out of the draft.
- The register is decided by **destination, not medium**. A paragraph drafted in chat that the user will paste into their report is AS THE USER. Chat is never FOR AGENTS, even in a turn spent writing agent files.
- Announcing the register makes the choice visible, so the user can correct it before the text is written.

## Adapting the registers to your setup

- **Rename** a register to the name your workspace already uses, for example the user's own name in place of "the user". Rename the reference file with it, or keep the file and change only the label.
- **Add** a register when a real audience falls outside the three, for example text written in the name of a team or organisation rather than one person. Give it its own reference file and one line in the list above, stating who reads it and in whose name it speaks.
- **Point AS THE USER at the user's own voice notes**: a voice guide, style sheet or writing samples. `references/as-the-user.md` says where they load; without them, ask for a source before drafting.
- Put workspace-specific names, paths and preferences in `references/local.md` (and further `references/local-*.md` files if needed), not in the general files.
