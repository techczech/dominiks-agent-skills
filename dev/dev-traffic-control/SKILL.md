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

A record link always starts with `open/` and ends with the file's real name, `.md` included. Wrong: `dtc://example-app/2026-01-15-export-check`. Right: `dtc://open/example-app/2026-01-15-export-check.md`. From 0.22.0 the app opens the wrong form too, but write the right one: other tools read these links. Check the file exists at that path before sending the link.

Write it as a markdown link, never a bare URL and never in a code fence: `[Open the request in Dev Traffic Control](dtc://open/example-app/2026-09-11-action-bar.md)`. A terminal makes a bare `dtc://` dead text; a markdown link carries any scheme.

Say in the same reply whether anything is watching (§ 4).

## 2. Where the formats live

The app writes the authoritative file contract into the record root's own `AGENTS.md`. **Read it before writing a record type for the first time in a session**; where it and the references below disagree, it wins, because it matches the installed app. Never edit it. Never run Git inside the record root; leave commits to the tool that syncs it.

Ownership: agents write requests, release records, roadmap idea files, handoff documents, thread entries, `.resolved.md` markers, `.watch.json` claims and `.collected.json` receipts. The app writes reports, answers, roadmap order, handoff state, notes and `.opened.json`. Requests and thread entries are immutable once written; changed questions need a new request.

## 3. Filing

- **Screenshot pass before a request (2026-10-08).** For an Electron app where something visible changed, run the Haiku screenshot pass first (`agent-roles` § Verification) and file what is left as a `kind: doc-review` with the pictures embedded and a decision toggle per judgement call, since a light request renders no images. Drop what the pictures settle; say in the intro what was dropped.
- **Test a feature:** a light request by default: at most four user-facing checks, one paragraph each, in `## Heading {#id}` blocks, and a reserved `## Also worth checking` last. See [requests and reviews](references/requests-and-reviews.md).
- **Review a design or document:** `kind: doc-review`, a short decision-focused distillation with drawings embedded as images and ```` ```decision {#id} ```` blocks for choices.
- **Before filing, check the request itself:**
  - Checks that consume sample data (answering a verdict, archiving) come **after** the checks that need it.
  - Never ask the reviewer to run a terminal command; give a link to click, in the check and in chat.
  - Point a check at a sandbox project in the record root (for example a `playground/` folder) when trying it could disturb real work.
- **A version bump writes the release record.** The same turn you bump an app's version, add or update `releases/<version>.md` with what the version gives the reviewer, in feature-first words. A release without a record does not exist for the reviewer.
- **Release features:** `state:` is exactly `notstarted`, `building`, `built` or `you`; any other word (such as `planned`) is ignored by the app and the feature vanishes from Releases. Each `## Feature` heading states what changed and what is judged ("The editor window can be dragged by its title bar"), never a step ("Press on the bar and drag"). Steps go under `**How to check**`. Set `since: YYYY-MM-DD` whenever you change a `state:`. A verdict can carry screenshots; open every one. See [work records](references/work-records.md).
- A link to a test request opens as the narrow pinned sidebar; any other record opens big and unpinned. Both land in focus mode.

## 4. Watching

**With the `dtc-inbox` Claude Code mod loaded** (the `dtc_answers` tool is available): do not start a shell watch. The mod notices the answer and delivers it to the session that filed the request. When it arrives, or when asked to collect, call `dtc_answers` for the request and act on what it returns (§ 5). Say in the reply that the mod is watching.

**Without the mod**, a session that stays alive for the answer waits in two phases ([report lifecycle](references/report-lifecycle.md)):
1. A token-free background shell blocks until `<basename>.opened.json` appears (the reviewer opened it). No polling from the model, no `.watch.json` yet.
2. Then write `.watch.json` with a 30-second heartbeat until `.report.json` has `completedAt`, then remove the claim and collect.

A cold answer is collected by hand from the prompt DTC copies. Never imply a watch that is not running.

## 5. Collecting

A report is final only when `completedAt` exists. `dtc_answers` (the mod) returns the same content as the report file; without it, read the file. Read every item's status and comment, screenshots, `observations[]` and doc-review decisions, which are nested at `items[0].decisions`, never top-level. Also read `markups[]` on decisions, items and observations: the reviewer's marked-up pictures, with each numbered mark's words in `marks[].text` (format in the record root's `AGENTS.md`). A `skip` status can still carry answers. File each actionable point where the project keeps them, act on it, then write `<basename>.collected.json` naming where each went. If the reviewer answered in chat instead, write `<basename>.resolved.md`. Short DTC comments are compressed: when one has two readings, ask with the readings spelled out before building.

## 6. Feature requests and the roadmap

Every suggestion the reviewer makes is filed as a roadmap idea (`<project>/roadmap/<id>.md`) the moment it is made, wherever it was said: a review comment, a check, chat, a thread. The app lists these under **Feature requests** and shows what happened to each. Full fields and rules: [work records](references/work-records.md).

- File it with `by: reviewer`, the reviewer's exact words in `quote`, `said` (where, when, and a link to the record if one exists), a `context` that states the whole point in one to three sentences, a `plan`, and a `fate`. Never invent a quote.
- A request with no `plan` or no `fate` shows as "No plan yet" and counts as owed by you. Keep `fate` and `fate_note` current when work lands, merges or is declined.
- The reviewer answers on the card. The app appends `## Reviewer entry · <date> · <answer>` to the idea's body. Read it, act, and reply by appending `## Agent entry · <date>` with your answer in the text below it. Do not edit earlier entries.
- **Approve → Roadmap** is the reviewer's button: it sets `fate: planned` and `candidate: <pending version>`. Do not set `planned` on a `waiting` idea yourself.
- Two prompts arrive from the app's buttons: "plan this request" (fill in `context`, `plan`, `fate`, `related` on one idea and reply with its link) and "review all requests" (give every request a plan and fate, propose priorities and `candidate` releases, and file a doc-review of the proposed order for approval).

## Versions

Features the skill relies on, and the DTC build that brought them:

| Feature | Needs |
|---|---|
| `dtc://` links open the record | 0.21.0-alpha.4 |
| `.opened.json` arming (two-phase watch) | 0.21.0-alpha.13 |
| Verdict sheet; nothing sends the reviewer to Releases for a verdict | 0.21.0-alpha.14 |
| Links open by kind (sidebar or big), always in focus mode | 0.21.0-alpha.20 |
| Release (and `#feature`), roadmap-idea, handoff and thread-entry links open on the item, not the project | 0.21.0-alpha.21 |
| Feature `since:` dates on release rows; screenshots on verdict answers | 0.21.0-alpha.25 |
| Option pictures on decision lines; `markups[]` in reports | 0.22.0 |
| Feature-request fields, reviewer and agent entries, Approve → Roadmap, pending release | 0.22.0 |
| Links without `open/` or `.md` still open | 0.22.0 |
| `dtc-inbox` mod 0.2.0: `dtc_answers` with mark text, feature-request answers and release verdicts | 0.22.0 |

When a DTC release changes what agents write or how records open, update this table and the section it affects in the same round.
