# Handoff notes

Notes live in the hub, not in each project repo. Reason: a fresh session cannot know which project repo to open, but it always opens the hub. The notes tell it where work stands across all projects.

## Files in `<hub>/.remember/`

| File | Holds |
|---|---|
| `now.md` | current handoff; overwritten each time; first thing read |
| `today-YYYY-MM-DD.md` | log of today's entries |
| `recent.md` | compressed last 7 days |
| `archive.md` | older, compressed; append only |

Rolling buffer: at day end `today-*` is compressed into `recent.md` and renamed `.done.md`; entries older than 7 days move from `recent.md` to `archive.md`. Any agent may run this; a scheduled job is better.

## now.md template

See `assets/templates/now.md`. Fields: updated (date, time); in flight (one line per project: path, state, next step); blocked on user (link to the review item); do not touch (files another session is editing).

## Rules

- Write for a reader with no memory of this conversation. Name the project path, not "the app".
- Each entry: what happened, state now, next step, where the evidence is. Under 10 lines.
- Update `now.md` before ending a session or when switching project.
- Do not paste content from project files; link to the path.
- Never record secrets.
- Check: could a cold agent resume from `now.md` alone? If not, add what is missing.

## Failure modes

- Notes written per project repo: sessions started in the hub cannot see them.
- `now.md` appended forever: it becomes the archive. Overwrite it.
- Entries say "continued work on the thing": useless cold.
