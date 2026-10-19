# Backlog

One place that holds every session's intent, so work started in a chat is never lost when the chat ends.

## Layout

```
<backlog>/
  AGENTS.md          rules
  events/            one file per capture, never edited
  tasks/             promoted work, one file per task, with checkpoints and receipts
  views/             generated: inbox, open tasks
  scripts/           optional helpers; plain files work too
```

## First move

Every substantive new session starts with one capture: a one-line summary of what the session is for.
File name: `events/<yyyy-mm-dd>-<hhmm>-<slug>.md`. Fields: time, project path, summary, session id if known. Atomic, append-only.

## Operations

| Operation | When | Effect |
|---|---|---|
| capture | session start, or a new thread of work mid-chat | new event file |
| promote | the capture is real work that will outlive the session | task file with owner, status, next step |
| checkpoint | before stopping, switching, or hitting a long wait | append state and next step to the task |
| receipt | a useful state change happened (merged, sent, decided, installed) | append proof: what, where, evidence link |
| sweep | daily, by the user or a scheduled agent | classify quiet captures: promote, close, or ask |

## Rules

- Capture is cheap and never blocks. Do not ask the user before capturing.
- Promote only what has a next step. Chat that ended in an answer needs no task.
- A task is closed by a receipt, not by an agent saying "done".
- Checkpoint text must be readable cold: state, next step, where the files are.
- Mid-chat detour: capture it as a side thread and return to the main task with a one-line refocus note.

## Failure modes

- Capture skipped: sweep finds nothing, work is invisible. Put the rule in the global instruction file.
- Tasks promoted from every capture: backlog becomes a second inbox. Promote selectively.
- Task closed without receipt: state is unverifiable. Require evidence.
