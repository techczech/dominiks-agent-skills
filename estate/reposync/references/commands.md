# Existing RepoSync CLI surfaces

Examples name real 0.13.0 commands. Replace sample paths and machine identifiers with verified values. Optional flags below must still appear in the installed command's help. No real sync, checkpoint, placement or policy mutation is part of loading this skill.

## Inspection

| Command | Effect and boundary |
| --- | --- |
| `reposync status --json` | Fresh local scan and local state output; filter results for the selected repository. No `--path` flag in this command's inspected help. |
| `reposync status --fetch` | Fetches remotes before scanning; this adds network activity. |
| `reposync doctor` | Health checks; use its reported configuration rather than legacy paths. |
| `reposync diff --machine MACHINE --changes-only` | Compares cached machine reports. Check timestamps. |
| `reposync desktop snapshot --json` | Returns the app's repository rows and conflict sections. |
| `reposync local board --json` | Returns local manual-resolution issues. Verify this subcommand's help on the installed version. |
| `reposync report pull` | Downloads known peer reports and updates the local fleet cache; does not cause peers to rescan. |
| `reposync plan --machine MACHINE --json` | Resolves carry intent against known reality for one canonical machine. |
| `reposync fill --dry-run --json` | Plans a fill without moving bytes or writing fill state. |
| `reposync evict --paths UNIT --dry-run --json` | Evaluates eviction gates for the exact relative Unit path. |

Do not substitute `registry check`, `profile check`, `clone` or a gist workflow from an older README when absent from installed help.

## Mutations

- `reposync sync --path "bucket/repository"` runs the sync engine for one relative path. It may move source changes between local and remote repositories. `fix` can pull behind/clean repositories and push ahead/clean repositories; do not describe it as pull-only.
- `reposync report push` uploads repository metadata in a machine report. It is separate from pushing repository contents and needs the corresponding scope.
- `reposync get "bucket/unit"` brings a Unit here; `--full` changes copy depth. `fill` without `--dry-run` can affect multiple Units. Inspect their plans and intent first.
- `carry` and `policy push/pull/repair/migrate` affect shared or local policy. Use current help and the user's requested machine/Unit; never rewrite policy JSON as a shortcut.
- `evict --yes` permits deletion after its gates; a dry run is not approval. Keep exact paths and the user's free-space scope. Do not use deletion to resolve ambiguous duplicate ownership.
- `desktop actions preview --input REQUEST --json` validates a structured request. `apply` acts on it; `undo --token VALUE` is a supported move-batch undo, not universal rollback. Obtain the JSON schema from the current app/source or an existing request; do not guess its shape.
- `tag` may create and push release tags. It is not a status command.

Keep credentials in the existing configured store. Do not dump policy/report contents wholesale into public output; repository paths, machine identities and metadata can be private. Summary claims about an entire fleet need evidence for each relevant machine.
