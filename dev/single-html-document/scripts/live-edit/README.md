# live-edit

FOR AGENTS. Local server and page runtime that let a reader edit text and answer feedback questions inside an HTML page, with changes landing in the source file.

## Use

```
node live-edit-server.mjs serve <page.html> [--source <file.md>] [--port 8790] [--root <dir>] [--allow-host <name>]... [--idle-hours 4] [--inject-runtime] [--editable <file>]...
```

Include `live-edit-runtime.js` in the page, or pass `--inject-runtime` (`runtime: <text>` to `startServer`): the server then serves the runtime at `/__live-edit/runtime.js` and adds a script tag for it before the last `</body>` of the page it serves (the response only; the file is not changed; a page already naming `live-edit-runtime` is left as it is). The runtime shows a bar with **Edit text** (key `E`) and an **Editing live** badge, saves a changed passage when you leave the paragraph and notes under it where it went ("Saved to <file>") or that it was kept aside; text answers in `[data-feedback-id]` get a **Save answer** button. A page with no `data-source-ref` at all makes its text blocks editable; those edits go to the source when the server has one, otherwise to the HTML file (exact-match rule, text escaped as HTML). `--editable <file>` (repeatable; `editable` in `startServer`) limits `/__edit` to those files: an edit naming any other file is kept aside with the reason "not this page's source", so a page's own scripts cannot write elsewhere in the folder. ReportScout passes the page's source, or the page itself when it has none; `data-source-ref` pointing at other files is then kept aside. The runtime sends the smallest changed passage widened to whole words (at least 24 characters, unique within the element), not the whole paragraph. Mark editable elements `data-source-ref="pages/02-scope.md#purpose"` and feedback controls `data-feedback-id="q1"`. Set `LIVE_EDIT_TOKEN` in the server environment to require header `x-live-edit-token` on writes (the page prompts for it once per tab). No token is ever written to a file.

One server per root: `.live-edit/server.lock` holds pid and port; a second server for the same root refuses to start while the first is alive (a stale lock is replaced).

When served through `tailscale serve`, pass the tailnet hostname with `--allow-host <name>`; otherwise the Host check returns 421.

A `sourceRef` naming a missing file, a symlinked target, or a non-UTF-8 file is kept aside in `pending.jsonl`; nothing falls back to another file.

## Endpoints (127.0.0.1 only; Host must be 127.0.0.1:port, localhost:port or an `--allow-host` value)

- `GET /__live` -> `{live, page, source, tokenRequired}`
- `POST /__edit` `{sourceRef, oldText, newText, pageId}` -> `{status:"saved", file}` or `{status:"kept-aside", reason}`. `oldText` must occur exactly once in the section named by the `#anchor` (Markdown heading slug; whole file if no anchor). No Markdown source: the same rule applies to the HTML file. Never fuzzy, never a whole-file rewrite.
- `POST /__feedback` `{questionId|sourceRef, text, pageId}` -> appended to `<source-name>.feedback.jsonl` and `.feedback.md` next to the source (or the page).
- `GET /__live-edit/runtime.js` -> the runtime (only when started with the runtime).
- Everything else: GET/HEAD static files from the root; dotfiles and paths outside the root refused. Writes: POST, JSON, max 256 KB.

## Files (under `<root>/.live-edit/`)

- `backups/<timestamp>-<name>`: copy before the first write of a server session.
- `<YYYY-MM-DD>-<name>.diff`: unified diff appended per save.
- `pending.jsonl`: edits kept aside (reason, sourceRef, oldText, newText).

Test (run from this folder): `node --test test/*.test.mjs`.
