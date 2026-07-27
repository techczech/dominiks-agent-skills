# Backlog State Machine

Every backlog entry has a `status` in its frontmatter. The set of valid values
and transitions is fixed.

## States

| State | Meaning |
|---|---|
| `proposed` | Captured as an idea. Not yet endorsed. May be dropped. |
| `active` | Endorsed. In the queue. Not yet started. |
| `in-progress` | Someone is actively working on it. |
| `done` | Completed. A `change` entry exists and is linked via `refs.resolved_by`. |
| `deferred` | Deliberately postponed. Reason should be in the body. |
| `dropped` | Explicitly not going to do. Kept for audit trail. |

## Valid transitions

```
proposed  ──▶  active        (endorsed; moving into the queue)
proposed  ──▶  dropped       (rejected at triage)

active    ──▶  in-progress   (work started)
active    ──▶  deferred      (bumped out of the current window)
active    ──▶  dropped       (re-triaged as no-go)

in-progress ──▶ done         (shipped; requires resolved_by ref)
in-progress ──▶ active       (work paused; returned to queue)
in-progress ──▶ deferred     (paused and de-scheduled)

deferred  ──▶  active        (pulled back into the queue)
deferred  ──▶  dropped       (confirmed no-go)

done      ──▶  (terminal; archive via archive_done.py)
dropped   ──▶  (terminal; archive via archive_done.py)
```

`proposed` is the default for `new_entry.py --type backlog`.

## Closing an item

Use `close_backlog.py <id> --resolved-by <change_id>`. It:

1. Finds the backlog entry by `id`.
2. Sets `status: done`.
3. Writes `refs.resolved_by: [<change_id>]`.
4. Finds the change entry and writes the inverse `refs.resolves: [<id>]`.
5. Stamps `updated: <today>` on both.

Do not set `status: done` by hand unless you also write both sides of the ref.

## Archiving

`archive_done.py --older-than 90d` moves entries whose status is `done` or
`dropped` and whose `updated` date is older than the threshold into
`changelog/archive/backlog/YYYY/`. `build_index.py` reads archived entries
and lists them in a collapsed section.

Archiving preserves files; it never deletes. The ref graph still resolves
because `build_index.py` walks both active and archived entries.

## Naming

Pick ONE convention per backlog queue:

- **priority-numbered**: `NN-slug.md` where `NN` is a two-digit priority.
  Renumber as priorities change. Use when the queue is curated and ordered.
- **topic-named**: `slug.md`. Use when items are independent and priority
  does not imply ordering.

Do not mix the two in the same queue. A mixed queue signals that there is
actually a curated sub-queue embedded inside a grab bag — split them into
two queues or pick one convention.

If a project has multiple queues (e.g. feedback-driven vs. infrastructure),
put them in subdirectories under `backlog/` and index each separately.
