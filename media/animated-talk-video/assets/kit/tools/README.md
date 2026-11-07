---
title: Kit tools: review page and review feedback
register: FOR AGENTS
date: 2026-10-16
---

# Review page and review feedback

## Files

- `review-page.mjs`: writes `<project>/review/review.html` (player + scene rail + notes). Copies `hyperframes-player.global.js`, `hyperframe.runtime.iife.js`, `review-composition.html` (the composition with `../` added to relative URLs), `review-feedback.js`, `review-feedback-format.js` into `<project>/review/`. Nothing review-related goes in the project root, so `hyperframes check` sees one composition. Old root-level review files and `feedback/` are moved or removed on regeneration.
- `review-serve.mjs`: the `serve` mode. `review-feedback.js`: notes UI. `review-feedback-format.cjs`: Markdown formatter shared by page and server.

## Commands

- Generate: `node kit/tools/review-page.mjs .` (re-run after every change to `index.html` or `scenes.json`).
- Serve: `node kit/tools/review-page.mjs serve . [--port 4777]` → open `http://127.0.0.1:4777/review/review.html`. Binds 127.0.0.1 only. Stop with Ctrl+C. Never leave it running after a session.

## How the reviewer gives feedback

- N or Note button: note at current time (pauses). Click the picture: note with a pin (x, y as % of the 16:9 picture). ⌘Enter saves the note, Esc cancels. Notes list under their scene in the rail; click = seek; Edit, Delete. One general note for the whole video.
- Drafts live in localStorage, key `hf-review:<project folder name>:<composition hash>`. Hash = first 12 hex of sha256(review-composition.html + scene list). A regenerated page with changed content shows a warning and offers to load or discard older drafts.
- Served page: "Save feedback" → server writes the files below and the page shows `Saved: feedback/<name>.json`.
- Opened as `file://`: "Copy feedback" (Markdown + JSON block; select-text fallback) and "Download feedback.json". The reviewer pastes it into chat or drops the file; no file is written into the project.

## Where feedback lands

`<project>/review/feedback/<YYYY-MM-DD-HHMMSS>-feedback.json` and `...-feedback.md` (same stem; `-2`, `-3` on a same-second clash). Names are made by the server; nothing in the request picks a path. Read the newest pair; older pairs are earlier rounds.

JSON shape (server rebuilds it from known fields; `savedAt` is server time; notes sorted by `t`):

```json
{ "version": 1, "project": "gallery", "compositionHash": "6c30bfbfe0e5", "savedAt": "2026-10-16T08:06:29.294Z",
  "general": "text, may be empty",
  "notes": [ { "id": "nmvaon6xnikjv", "scene": { "n": 6, "id": "s6", "title": "The model and the harness" },
               "t": 37.5, "pin": { "x": 29.9, "y": 39.9 }, "text": "Icon here is too small." } ] }
```

- `scene.n` = 1-based scene index in `scenes.json`; `scene.id` = the scene's `id`; `t` = seconds on the composition clock; `pin` = null or % of the picture from top-left.
- If `compositionHash` differs from the current page's hash (printed by the generator), the notes refer to an older cut: map them by `scene.id` and say so.
- MD: one line per note: `N. Scene <n> "<title>" · m:ss.f (t s) · pin x%, y% · text`.
- To see a pinned spot: `npx --yes hyperframes@0.8.214 snapshot --at <t>` and look at the pin position. The server does not snapshot.

## Server limits (rejections return JSON `{ ok:false, error }`)

- Only `POST /__feedback` writes; other methods → 405. Static GET/HEAD inside the project only (resolved and realpath-checked).
- Host must be `127.0.0.1:<port>` or `localhost:<port>` (421); a present Origin must be the same (403, so `file://` `null` is refused); body must be `application/json` (415).
- Body ≤ 1 MB (413), ≤ 500 notes, unknown fields rejected (400). Caps: note text 5000, general 20000, scene title 300, ids 64, project 200.
