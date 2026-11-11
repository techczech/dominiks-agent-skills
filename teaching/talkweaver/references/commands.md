# Commands (generated)

Generated from the app's verb inventory at build. Do not edit. When to use each verb: [CLI](cli.md).

Exit codes: 0 done or ready, 1 not done or not ready, 2 usage error. `setup` refuses while the app is open.

## setup

| Command | Arguments | What it does |
|---|---|---|
| `talkweaver setup status` | `[--json]` | Reads every row of publishing, live service, recording storage, transcription and the Importer. Exit 0 when connected and Publishing and Going live are Ready. |
| `talkweaver setup cloudflare connect` | `[--json]` | Reads the Cloudflare token from standard input, saves it to the operating system's secure storage, checks it. |
| `talkweaver setup cloudflare account` | `<id> [--json]` | Chooses the account when the token sees several. |
| `talkweaver setup cloudflare create-site` | `[name] [--json]` | Sets the site name (default talkweaver-handouts) and creates the Pages site. |
| `talkweaver setup cloudflare live` | `[--json]` | Sets up or updates the live service. |
| `talkweaver setup cloudflare share-domain` | `<host> | --clear [--json]` | Attaches or removes the share-link address. |
| `talkweaver setup cloudflare disconnect` | `[--json]` | Removes the token; the deployed live service is left alone. |
| `talkweaver setup recording` | `--endpoint <url> --bucket <name> [--json]` | Sets recording storage; access keys come from standard input; checks the bucket. |
| `talkweaver setup transcription` | `--python <path> --script <path> [--ffmpeg <path>] [--json]` | Sets the transcription paths (full paths) and checks them. |
| `talkweaver setup help` |  | Prints the list. |

## settings

| Command | Arguments | What it does |
|---|---|---|
| `talkweaver settings list` | `[--section <id>] [--json]` | Lists settings with their values (secrets have none). |
| `talkweaver settings get` | `<key> [--json]` | Reads one setting. |
| `talkweaver settings set` | `<key> <value> [--json]` | Changes one setting; refuses secrets and invalid values; logged as the agent. |
| `talkweaver settings reset` | `<key> | --section <id> | --all --yes [--json]` | Puts settings back to their defaults. |
| `talkweaver settings rebind` | `<command> <shortcut> [--json]` | Changes a shortcut ("cmd+shift+l" or "none"). |
| `talkweaver settings reset-shortcut` | `<command> | --all --yes [--json]` | Puts a shortcut (or all) back to its default. |
| `talkweaver settings changes` | `[--limit <n>] [--json]` | Shows the changelog, newest first. |
| `talkweaver settings export` | `<file> [--json]` | Writes the settings to a file. |
| `talkweaver settings import` | `<file> [--yes] [--json]` | Imports a settings file; settings that name something to run or somewhere to send data are skipped. |
| `talkweaver settings undo-import` | `--last | <batch> [--json]` | Undoes an import. |

## agent

| Command | Arguments | What it does |
|---|---|---|
| `talkweaver agent status` | `[--agent <id>] [--json]` | Lists the agents found on this computer, whether the skill is installed for each, its version and why a copy was kept. |
| `talkweaver agent install` | `--agent <id> [--agent <id>...] [--json]` | Installs the skill (and the command-line tool) for the named agents only. Keeps links, unmarked folders, edited copies and newer copies. |
| `talkweaver agent remove` | `--agent <id> [--agent <id>...] [--json]` | Removes the skill from the named agents, only where the app installed it and it is unedited. |

