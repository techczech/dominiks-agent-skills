# RepoSync checkpoint semantics

Verified against the 0.13.0 CLI help and checkpoint implementation. Recheck when the installed version changes.

```sh
reposync checkpoint --path "/absolute/path/inside/repository" --agent "Codex"
```

`--path` selects the enclosing repository, not a subset of files. The implementation stages all repository changes with `git add -A`. Before calling, inspect all pending changes and make sure a whole-repository checkpoint is authorised; unrelated user work may otherwise be committed too.

The command rejects unsafe Git states, honours a per-repository debounce, runs the configured gitleaks gate and creates a `wip:` commit. If an upstream is configured it also attempts a push. There is no `--no-push`, `--local-only`, `--dry-run` or file-selection flag in the inspected help.

**A request to save locally without publishing cannot be fulfilled with this checkpoint command when it may push.** Do not invent a flag, detach the upstream, change carry policy or bypass the gate to make it fit. Explain the limitation and use a separately authorised, established local-save workflow if permitted. If the record store forbids direct Git, that fallback is unavailable too.

`--no-debounce` bypasses only the debounce window. Use it when a required checkpoint must run immediately; it does not bypass safety or leak checks.

| Output | Meaning |
| --- | --- |
| `Committed` | A local commit was created. The best-effort push may still have failed. |
| `Clean` | The tree was clean; it does not establish that existing commits reached the remote. |
| `SkippedDebounce` | No checkpoint ran because of the recent-checkpoint window. Exit zero is not a new save. |
| `SkippedUnsafe` | An unsafe state or operation failure prevented the checkpoint. Inspect before retrying. |
| `SkippedLeaks` | The leak gate failed or could not run. Do not print secret values or bypass it. |
| `SkippedNotUnderRoot` | The requested path did not resolve to an eligible repository under the configured root. |

After a checkpoint, verify the resulting commit and pending changes through allowed read-only inspection. Verify remote state separately when a push was requested. Never infer remote delivery from `Committed`, a zero exit code or a board row alone.
