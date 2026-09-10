# DTC report and collection lifecycle

## Read finality and ownership

The app autosaves `<basename>.report.json`. No report means waiting; a report without `completedAt` means in progress; a stamped report is complete. Reopening clears the completion stamp. Read partials only when explicitly requested and label them partial.

Reports, screenshots and user notes are app-owned. Read `noteFiles` and linked screenshots; notes are final only when `handedOverAt` is set. Do not author verdicts or set completion timestamps yourself.

For detailed testing, `pass`, `partial`, `fail`, `skip`, `unanswered` mean distinct outcomes. Read comments even on pass. `flagged[]` points to failed expectations by zero-based `expectedIndex`; `quotes[]` contains selected text and comments. Skips and unanswered items are unverified.

For `mode: light`, pass means it works; fail means the reviewer flagged something; unanswered is not a verdict. `observations[]` contains separate notes with their own IDs, text and screenshots. File every actionable observation separately and record its destination, even when unrelated to the requested checks. Ignored parked checks are not missing required answers.

For document review, the `document` item's disposition is: pass = approved; partial = approved with changes; fail = needs rework; skip = not reviewed. Read `quotes`, `sectionMarks`, screenshots and `decisions`; an empty decision choice remains undecided. Approval with changes does not mean the changes have been made.

## Collection receipt

Once the finished feedback has been read and acted on, write agent-owned `<basename>.collected.json`:

```json
{
  "agent": "Codex",
  "machine": "actual-hostname",
  "collectedAt": "2026-09-10T12:00:00Z",
  "note": "Recorded the export defect and two observations in the project's issue log."
}
```

Use the actual hostname and current timestamp; these are examples. Point to real destinations. Do not claim collection while observations remain unfiled. Preserve the app-owned report and write the outcome in the project's existing development record outside the report sidecar.

## Answer received in chat

When the user resolves a request in chat, create `<basename>.resolved.md`:

```markdown
---
resolved_by: Codex
at: 2026-09-10T12:00:00Z
---
The user confirmed the export works; outcome recorded in the project issue log.
```

Use the real outcome and location. This closes the queue without manufacturing a report. A collection receipt and a resolution marker serve different purposes. Do not turn a failed test into a pass merely by closing the request.

## Active watches

Write `<basename>.watch.json` only while actually polling: `{ "agent": "Codex", "machine": "actual-hostname", "startedAt": "...", "heartbeatAt": "..." }`. Update atomically about every 30 seconds from the polling loop and remove it when the watch stops. A live claim requires a heartbeat no older than 90 seconds and the same hostname as the app reading it. A remote watcher may not appear live locally; report that limitation honestly. Do not create a standing watch or imply monitoring merely because a request was written.
