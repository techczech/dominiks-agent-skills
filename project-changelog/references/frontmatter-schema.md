# Frontmatter Schema

Every entry file in `changelog/` (except `logs/worklog.jsonl`) starts with YAML
frontmatter. One schema covers all four entry types; the `type` and `status`
fields vary. Missing optional fields are fine — do not invent values.

## Common fields

| Field | Required | Type | Notes |
|---|---|---|---|
| `title` | yes | string | Human-readable. Match the `# Heading` below. |
| `id` | yes | string | Stable slug. Matches the filename without `.md`. |
| `date` | yes | ISO date | Date of creation or the primary event described. |
| `type` | yes | enum | `change` \| `decision` \| `phase` \| `backlog` |
| `status` | yes | enum | See per-type values below. |
| `priority` | no | enum | Optional ticket priority. `low` \| `medium` \| `high` \| `critical` |
| `owner` | no | string or list | Optional human or team owner for ticket-grade backlog work. |
| `depends_on` | no | list | Optional execution dependency list. Use entry IDs only. |
| `artifacts` | no | list | Optional relative paths or URLs pointing at external planning docs or source artefacts. |
| `tags` | no | list | Free-form topic tags. Lowercase. |
| `refs` | no | mapping | Cross-references to other entries. See below. |
| `superseded_by` | no | list | IDs that replace this entry. Used on decisions and backlog items. |
| `updated` | no | ISO date | Last meaningful edit. `build_index.py` sorts on this. |

## Per-type `status` values

- **change**: `draft` | `shipped`
- **decision**: `proposed` | `accepted` | `superseded`
- **phase**: `active` | `completed`
- **backlog**: `proposed` | `active` | `in-progress` | `done` | `deferred` | `dropped`

See `backlog-states.md` for the backlog state machine and transitions.

## The `refs` mapping

`refs` captures relationships between entries. Keys are verbs; values are lists
of entry IDs (without `.md`), optionally prefixed by the bucket if ambiguous.

| Key | Used on | Meaning |
|---|---|---|
| `resolves` | change | This change resolved the listed backlog item(s). |
| `resolved_by` | backlog | This backlog item was resolved by the listed change(s). |
| `implements` | change | This change implements the listed decision(s). |
| `implemented_by` | decision | This decision is implemented by the listed change(s). |
| `supersedes` | decision, backlog | This entry replaces the listed entries. |
| `part_of` | change, backlog | This entry belongs to the listed phase(s). |

`close_backlog.py` writes both sides of `resolves`/`resolved_by` automatically.
For other pairs, write one side; `build_index.py` reports missing inverses.

## Planning-bridge fields

These fields are optional and primarily useful on ticket-grade backlog entries.

- `priority`: execution priority for fine-grained work items
- `owner`: a single string or a list of owners
- `depends_on`: execution dependencies between backlog entries
- `artifacts`: external planning documents such as PRDs, architecture notes,
  phased plans, or ticket-source markdown that remain outside `changelog/`

Use `depends_on` for execution ordering. Use `refs` for narrative relationships
such as `part_of`, `resolves`, and `implements`.

## Per-type example blocks

### change

```yaml
---
title: Archive Images Lite
id: archive-images-lite
date: 2026-03-11
type: change
status: shipped
tags: [media, images]
refs:
  resolves: [05-showcase-multi-image-and-clone-media-audit]
  implements: [2026-03-05-canonical-archive-interfaces]
updated: 2026-03-11
---
```

### decision

```yaml
---
title: Canonical Archive Interfaces
id: 2026-03-05-canonical-archive-interfaces
date: 2026-03-05
type: decision
status: accepted
tags: [architecture]
---
```

### phase

```yaml
---
title: Phase 1 Foundation
id: 2026-03-05-phase-1-foundation
date: 2026-03-05
type: phase
status: completed
tags: [foundation]
---
```

### backlog

```yaml
---
title: Showcase Source Categories Restoration
id: 01-showcase-source-categories-subunits-restoration
date: 2026-04-15
type: backlog
status: active
priority: high
owner: [platform, maintainer]
depends_on: [00-bootstrap-changelog]
artifacts: ["../reports/prototype-prd.md", "../reports/prototype-ticket-backlog.md"]
tags: [showcase, reviewer-feedback]
refs:
  part_of: [2026-04-15-reviewer-feedback-pass]
---
```

## Validation rules

`build_index.py` flags:

- missing required fields
- `status` value outside the type's vocabulary
- `priority` value outside the optional backlog vocabulary
- `id` that does not match the filename
- dangling `refs` that do not resolve to an existing entry
- dangling `depends_on` entries that do not resolve to an existing entry
- asymmetric refs (e.g. `resolves` with no matching `resolved_by`)
