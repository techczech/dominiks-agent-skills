# Task Log

This is the open-task inbox for the project.

Create one Markdown file per resumable request:

`_TASK-LOG/<YYYY-MM-DD>-<short-slug>.md`

Use `_TASK-LOG/TEMPLATE.md` for new tasks. Keep each task short enough that a future agent can quickly answer:

- What was requested?
- What state is it in?
- What is needed next?
- Where are the links or outputs?

Task logs are operational records, not changelog entries. Use `_CHANGELOG/` only for coding-feature history, backlog, implementation decisions, and meaningful change narrative when that system is enabled.

When available, create tasks with:

```bash
python3 _AGENT-INSTRUCTIONS/scripts/new-task.py "Short task title"
```

The helper fills `audit.thread_uri` from `CODEX_THREAD_ID` in Codex Desktop.

## Open Tasks

| Task | Status | Next action |
|---|---|---|

## Done

| Task | Completed | Result |
|---|---|---|
