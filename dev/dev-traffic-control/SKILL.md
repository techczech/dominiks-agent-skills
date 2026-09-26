---
name: dev-traffic-control
description: Dev Traffic Control (DTC). File test requests and reviews in the DTC record root, watch and collect answers, keep releases, roadmap, threads, handoffs. Use for anything DTC or dtc://. Always end with the dtc:// link.
---

# Dev Traffic Control

Dev Traffic Control (DTC) is a desktop app in which a reviewer checks agent work. Agents write records into its watched record root, one folder per project (the workspace instructions name the root); the app reads them and writes the reviewer's verdicts back as app-owned sidecars. This skill is the agent's side of that contract, and it follows the app's releases (see § Versions).

## 1. Every reply ends with the link (hard rule)

When a reply files, updates, collects or even mentions a DTC record, its **last line is a markdown link to that record**. A filed request announced in prose gets missed; that is what DTC's links exist to fix.

Build the address from the path you wrote. There is no lookup and no id.

| Record | Address |
|---|---|
| Request, review, release record, roadmap idea | `dtc://open/<project>/<path within the project>` |
| A feature in a release | `dtc://open/<project>/releases/<version>.md#<feature-id>` |
| Thread entry | `dtc://thread/<project>/<thread id from the entry's thread: field>` (never `open`: that lands on the front page) |
| A whole project | `dtc://project/<project>` |

Write it as a markdown link, never a bare URL and never in a code fence: `[Open the request in Dev Traffic Control](dtc://open/example-app/2026-09-11-action-bar.md)`. A terminal makes a bare `dtc://` dead text; a markdown link carries any scheme.

Say in the same reply whether anything is watching (§ 4).

## 2. Where the formats live

The app writes the authoritative file contract into the record root's own `AGENTS.md`. **Read it before writing a record type for the first time in a session**; where it and the references below disagree, it wins, because it matches the installed app. Never edit it. Never run Git inside the record root; leave commits to the tool that syncs it.

Ownership: agents write requests, release records, roadmap idea files, handoff documents, thread entries, `.resolved.md` markers, `.watch.json` claims and `.collected.json` receipts. The app writes reports, answers, roadmap order, handoff state, notes and `.opened.json`. Requests and thread entries are immutable once written; changed questions need a new request.

## 3. Filing

- **Test a feature:** a light request by default: at most four user-facing checks, one paragraph each, in `## Heading {#id}` blocks, and a reserved `## Also worth checking` last. See [requests and reviews](references/requests-and-reviews.md).
- **Review a design or document:** `kind: doc-review`, a short decision-focused distillation with drawings embedded as images and ```` ```decision {#id} ```` blocks for choices.
- **Before filing, check the request itself:**
  - Checks that consume sample data (answering a verdict, archiving) come **after** the checks that need it.
  - Never ask the reviewer to run a terminal command; give a link to click, in the check and in chat.
  - Point a check at a sandbox project in the record root (for example a `playground/` folder) when trying it could disturb real work.
- **Release features:** each `## Feature` heading states what changed and what is judged ("The editor window can be dragged by its title bar"), never a step ("Press on the bar and drag"). Steps go under `**How to check**`. See [work records](references/work-records.md).
- A link to a test request opens as the narrow pinned sidebar; any other record opens big and unpinned. Both land in focus mode.

## 4. Watching

A session that stays alive for the answer waits in two phases ([report lifecycle](references/report-lifecycle.md)):
1. A token-free background shell blocks until `<basename>.opened.json` appears (the reviewer opened it). No polling from the model, no `.watch.json` yet.
2. Then write `.watch.json` with a 30-second heartbeat until `.report.json` has `completedAt`, then remove the claim and collect.

A cold answer is collected by hand from the prompt DTC copies. Never imply a watch that is not running.

## 5. Collecting

A report is final only when `completedAt` exists. Read every item's status and comment, screenshots, `observations[]` and doc-review `decisions`. File each actionable point where the project keeps them, act on it, then write `<basename>.collected.json` naming where each went. If the reviewer answered in chat instead, write `<basename>.resolved.md`. Short DTC comments are compressed: when one has two readings, ask with the readings spelled out before building.

## Versions

Features the skill relies on, and the DTC build that brought them:

| Feature | Needs |
|---|---|
| `dtc://` links open the record | 0.21.0-alpha.4 |
| `.opened.json` arming (two-phase watch) | 0.21.0-alpha.13 |
| Verdict sheet; nothing sends the reviewer to Releases for a verdict | 0.21.0-alpha.14 |
| Links open by kind (sidebar or big), always in focus mode | 0.21.0-alpha.20 |

When a DTC release changes what agents write or how records open, update this table and the section it affects in the same round.
