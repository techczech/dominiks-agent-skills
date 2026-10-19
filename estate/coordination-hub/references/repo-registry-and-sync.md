# Repo registry and sync

Plain git plus one table. No special tooling needed; `scripts/scaffold_hub.py --status` automates step 2.

## 1. Registry

One file, `<hub>/repo-registry.md`, lists every repo you use. Template: `assets/templates/repo-registry.md`.

| Name | Path | Remote | Domain | Purpose |
|---|---|---|---|---|
| notes-app | ~/projects/apps/notes-app | git@host:me/notes-app.git | apps | Personal notes app |

- One row per repo; add a row when you create or clone a repo; remove it when you retire the repo.
- Domain is a folder name in the hub. The hub map reaches repos through this table: each domain's AGENTS.md says "repos for this domain: rows with domain `<domain>` in `repo-registry.md`".
- A moved repo: fix the registry first, then any router that names the path.
- Agents read this file instead of searching the disk.

## 2. Routine state check

Run for each registry row at session start, at session end, and before switching machine.

```
git -C <path> status --porcelain          # any output: uncommitted or untracked work
git -C <path> fetch --quiet
git -C <path> rev-list --count @{u}..HEAD # N > 0: N commits not pushed
git -C <path> rev-list --count HEAD..@{u} # N > 0: N commits not pulled
git -C <path> branch -vv                  # "gone" upstream or no upstream: stale or local-only branch
git -C <path> worktree list               # extra worktrees: someone may be editing there
```

| Result | Meaning | Action |
|---|---|---|
| status output | work at risk on this machine | review, commit if authorised, else report |
| ahead > 0, behind 0 | unpushed | push |
| behind > 0, ahead 0 | out of date | pull (fast-forward only) |
| ahead > 0 and behind > 0 | diverged | stop; ask the user |
| branch upstream gone | merged or deleted remotely | confirm merged, then delete locally |
| no upstream | exists only here | push it or record why not |
| extra worktree | parallel work | do not edit it; check its owner in `now.md` |

## 3. Carrying work between machines

- Before leaving a machine: commit what is authorised, push, run the check. Work must never exist on one machine only.
- Before starting: pull (fast-forward only) every repo you will touch.
- One writer per working tree. A second session needing the same repo uses its own worktree on its own branch.
- Dirty or diverged repo you did not make dirty: stop and ask. Do not force-push, do not reset, do not auto-resolve merge conflicts.
- If a command in a chain fails (a pull, a merge), stop the chain; later commands may commit a broken state.

## 4. Checkpoint at session end

1. List changes (`git status --porcelain`). Separate what this session was authorised to change from everything else.
2. Review the diff of the authorised files; look for secrets and stray files.
3. Stage those files by name, not `git add -A`.
4. Commit with a message saying what changed and why, in one line plus detail if needed.
5. Push; confirm ahead count is 0.
6. In `now.md` and the task log, report anything left uncommitted and why (not authorised, unfinished, belongs to another session).

## Failure modes

- Registry stale: agents search the disk or edit the wrong clone. Update it on every clone, move or retirement.
- Sync by `git add -A` at session end: commits other sessions' work. Stage by name.
- Force-push to fix divergence: destroys the other machine's commits. Ask instead.
- Two sessions in one working tree: interleaved edits. Use worktrees.
