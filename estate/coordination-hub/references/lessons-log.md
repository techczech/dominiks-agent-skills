# Lessons log

Durable record of reusable facts, processes and failure modes found while working. Prevents repeating research and repeating mistakes.

## Layout

```
<lessons>/
  AGENTS.md           rules for entries
  lessons.jsonl       one line per entry: id, date, title, tags, path, one-line finding
  entries/<slug>/
    README.md         the lesson, short
    sources/          verbatim copies of what was consulted
```

## When to write

After a search, documentation check, investigation or diagnosis resolves something reusable: a fact, a process, a decision with reasons, a failure mode. Skip weather, prices, live status, and personal lookups.

## Entry template

See `assets/templates/lesson-entry.md`. Fields: question; finding; evidence (commands run, files, URLs, each archived under `sources/`); confidence and limits; when it applies; what to do next time.

## Rules

- Search `lessons.jsonl` before researching; update the existing entry if the topic matches.
- Record work already done. Do not start extra research only to enrich the entry.
- Archive what you consulted verbatim, not as a summary; a summary can drift from the source.
- State limits: secondary sources, untested, one machine only.
- Report facts and how they connect; put advice in AGENTS.md, not in the entry.
- If the lesson is a rule agents must follow, also route it through self-healing.
- Append to `lessons.jsonl` last, after the entry folder is complete.

## Failure modes

- Lesson without evidence: cannot be trusted later.
- Duplicate entries for one topic: update instead.
- Lesson stored only in chat memory: invisible to other sessions.
