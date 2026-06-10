## Upstream

**Origin:** {{UPSTREAM_URL}}
**Fork reason:** {{FORK_REASON}}
**Tracking policy:** {{TRACKING_POLICY}}

## What this is

A third-party fork. The user did not author this code. Treat as reference unless a specific local modification is documented below.

## Local modifications

{{LOCAL_MODS}}

## Rules for agents

- **Do not** refactor, lint, or reformat upstream code. It creates noise when pulling upstream.
- **Do** document any local patch in the project task log or changelog.
- Prefer filing issues/PRs upstream over local edits when the fix is generally useful.

## How this folder is synced

Registered in the repo registry (`repo-map.tsv`) under the `x-forks` group with `clone_policy` typically set. Never move to a numbered group folder — those are reserved for the user's own projects.
