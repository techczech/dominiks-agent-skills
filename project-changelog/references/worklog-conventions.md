# Worklog Conventions

`changelog/logs/worklog.jsonl` is an append-only log of repeatable pipeline
runs. One JSON object per line. It is not for prose, decisions, or ad-hoc
events — those belong in `changes/` or `decisions/`.

## Required fields

| Field | Type | Notes |
|---|---|---|
| `timestamp` | ISO 8601 UTC | `2026-04-17T10:42:05+00:00` |
| `run_id` | string | Unique per run. Suggested: `YYYYMMDDTHHMMSSZ-<action>` |
| `action` | string | Short verb or verb-noun. `export`, `build-manifests`, `validate`. |
| `status` | string | `completed`, `completed-with-errors`, `failed`, `skipped` |

## Optional summary fields

| Field | Type | Notes |
|---|---|---|
| `duration_s` | number | Wall-clock seconds. |
| `inputs` | list | Input paths. Short list only. |
| `outputs` | list | Output paths. Short list only. |
| `record_counts` | object | `{"records": 10518, "orphans": 52}`. |
| `warning_count` | integer | Counter, not the warnings themselves. |
| `error_count` | integer | Counter. |
| `warnings_path` | string | Relative path to a file with the full warnings. |
| `errors_path` | string | Relative path to a file with the full errors. |
| `phase` | string | Optional tag, e.g. `phase-2-export`. |

## Hard rules

1. **One line per run.** Never wrap JSON across lines.
2. **No warning arrays.** Write the full warnings to a file and reference
   the path in `warnings_path`. Store details in `derived/run-logs/<run_id>/`
   or the equivalent run-artifact folder for your project.
3. **Size cap: 2 KB per line.** `append_worklog.py` enforces this and fails
   if exceeded. A line that can't fit within the cap is signaling that
   structured content is being smuggled into the log.
4. **Append-only.** Never rewrite old lines. To correct a prior entry,
   append a new entry with the same `run_id` and a new action like
   `amend-<original-action>`.
5. **UTC timestamps.** Avoid local-time ambiguity.

## Why a size cap

The cabinet-rescue worklog had single lines of ~20 KB because each run
embedded every parser warning verbatim, often the same message repeated 100
times. The log became unreadable with standard tools (`tail`, `less`, `jq`).

The cap forces the discipline of moving detail out of the log and keeping
the log itself as a scan-friendly timeline.

## Typical entry

```json
{"timestamp": "2026-04-17T10:42:05+00:00", "run_id": "20260417T104205Z-export", "action": "export", "status": "completed-with-errors", "duration_s": 42.1, "inputs": ["source-files/cabinet-no-users.sql"], "outputs": ["archive/", "derived/intermediate/20260417T104205Z-export/"], "record_counts": {"records": 12101, "assets": 7576}, "warning_count": 108, "warnings_path": "derived/run-logs/20260417T104205Z-export/warnings.json"}
```

## Reading the log

```bash
# tail recent runs
tail -n 20 changelog/logs/worklog.jsonl

# filter by action
grep '"action": "export"' changelog/logs/worklog.jsonl | tail -n 5

# parse with jq (each line is a full JSON object)
jq -c '{run_id, status, warning_count}' changelog/logs/worklog.jsonl | tail -n 20
```
