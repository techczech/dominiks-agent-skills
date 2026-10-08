# DTC work records

Read the installed root contract for exact current fields. Project folders can contain reserved `releases/`, `roadmap/`, `handoffs/` and `threads/`; these are not test rounds. `_unfiled/` is a supported destination for records without a product home.

## Release ledgers

`<project>/releases/<version>.md` is a living, agent-authored ledger. Frontmatter uses `app`, `release`, repository-relative `repo`, optional `handoff` and `updated`. Each `## Feature {#id}` is one user-facing feature. Leading field lines precede the prose; `**How to check**` introduces optional checking guidance.

**Feature titles explain; they never instruct.** The `## Feature` heading is what the reviewer reads first, and often all they read: on the project home, the release block and Releases. Write it as a plain statement of what changed and what is being judged, for example "The editor window can be dragged by its title bar". Never lead with a step or a command such as "Press anywhere on the bar and drag". Steps belong under `**How to check**`. If the heading needs the steps to make sense, rewrite the heading.

Declared `state` is exactly `notstarted`, `building`, `built` or `you`. Never declare `done`: it is derived from the app-written answers sidecar when the corresponding feature verdict is `works`. `kind: groundwork` has no state or user verdict; `unlocks` names the enabled feature.

Every time you change a feature's `state:`, set `since: YYYY-MM-DD` beside it to the day it reached that state. The row shows the later of `since` and the reviewer's answer time. A verdict answer can carry `screenshots` (paths relative to the project folder, under `releases/<version>.shots/`): open every picture it names before acting on the verdict.

**When a release ships, mark it shipped in its ledger yourself** if the reviewer has not done it in the app: the app then starts the next pending release on its own. Planned releases are not files: an approved roadmap idea carries `fate: planned` and `candidate: <version>`; never create `releases/<next>.md` while an earlier release is in flight.

Edit the ledger in place as work progresses, preserving unrelated fields. Read `<version>.answers.json`; never write it. `off` means something was flagged, not automatic rejection of the whole release. An absent answer is unanswered.

## Roadmap pool

`<project>/roadmap/<id>.md` is an idea record shared by app and agents; preserve fresh content and unknown frontmatter fields when editing. Use the installed contract for required fields and tier values. App-owned `roadmap/order.json` controls order and promotion/set-aside state; never edit it to move a card. App state can override a proposed candidate release in the idea file.

### Feature requests (0.22.0)

A roadmap idea the reviewer suggested is a feature request. It carries these optional frontmatter fields on top of `id`, `title`, `tier` and `added`:

| Field | Value |
|---|---|
| `by` | `reviewer` when the reviewer suggested it, `agent` when you did. |
| `said` | `{where, when, link}`: where it was said ("a review", "a check", "chat", "a thread"), the date, and a `dtc://open/…` link to the record when one exists. |
| `quote` | The reviewer's exact words. Leave it out when you do not have them. Never invent or tidy a quote. |
| `context` | One to three plain sentences: why it came up and what problem it solves. |
| `plan` | Your next step, in one or two sentences. |
| `fate` | `waiting` (needs the reviewer's decision) · `planned` · `building` · `built` · `merged` · `declined`. One line, no block scalar. |
| `fate_note` | Which release it was built in, what it merged into, or why it was declined. |
| `related` | A list of `dtc://open/…` links or ticket ids. |
| `candidate` | The release it is aimed at, as a version. One line. |

Rules:

- No `plan` or no `fate` shows as "No plan yet", owed by you.
- The reviewer's answers are appended by the app as `## Reviewer entry · <date> · <answer>` with an optional note below. Reply by appending `## Agent entry · <date>` and your answer in the text under it. Entries are append-only.
- Approve → Roadmap is the reviewer's action. It writes `fate: planned` and `candidate: <pending version>`. The pending version is the next minor after the highest release record; it is derived by the app and never a file. Do not move a `waiting` idea to `planned` yourself.
- The Roadmap shows approved ideas grouped by `candidate`. Moving a card rewrites `candidate`; do the same when you reschedule, and say why in an agent entry.
- Keep YAML valid: quote any string that contains a colon. An idea with invalid frontmatter disappears from the app.

## Handoffs

`<project>/handoffs/YYYY-MM-DD-<subject>-handoff.md` records work ready to continue. Fields include `title`, `domain`, repository-relative `repo`, `move: agent | me`, `state: live | superseded | done`, `updated` and a short concrete `resume`. Use only supported known values; do not invent who owns the next action. No project? Use `_unfiled/handoffs/`.

The app owns `<basename>.state.json` with pickup/archive timestamps. Read it; do not modify or delete it to manufacture pickup or reopen an item. Use an available app operation or leave a truthful proposed action.

## Threads

An entry is `YYYY-MM-DD-HHMM-entry-<subject>.md` in `<project>/threads/` or `_unfiled/threads/`. Entries are immutable, append-only contributions. A thread is the `thread` ID across entries, not a folder. Later entries can assert new state; do not rewrite earlier reasoning.

Required field: `thread`. Other supported fields include `title`, `by`, `written_by`, `at`, `projects`, `parents`, `move`, `form`, `state`, `outcome`, `dictation`. Thread `move` is `me | agent | nobody`; `state` is `open | retired`. Set `move: me` only when the entry's own body asks the reviewer a question they can answer; a pointer to a request or review gets a `dtc://` link and `move: agent`, because that record already waits on the reviewer. After the reviewer answers, append an entry that moves the thread off them. Use actual authorship and the installed schema's author vocabulary; do not relabel a user's words as agent reasoning or vice versa. Preserve dictated text and record the requested routing separately.

When an observation needs follow-up, use the project's established issue/task store or a correctly formed thread entry. Link that destination in the collection receipt. Do not invent an external backlog service or silently create a second task system.
