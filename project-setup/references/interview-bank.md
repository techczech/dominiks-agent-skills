# Extended Interview Question Bank

Optional probes organized by archetype. Use after the route/mode triage and core questions if the user is engaged and there is genuine ambiguity. Don't grill.

## Universal follow-ups

- "Anything you've learned from a similar past project that should inform this one?" — often surfaces a research/learning-log entry worth linking.
- "Is there a deadline driving this, or is it open-ended?" — affects whether to bootstrap `_CHANGELOG/phases/` for coding-feature or implementation milestones.
- "What would kill this project?" — surfaces critical dependencies and risks worth naming in AGENTS.md.
- "Where does the source material live?" — for content pipelines, the canonical-source path is load-bearing.

## Route and mode triage

Ask these before scaffolding or AGENTS drafting:

- "Are we reviewing an existing project, or starting a new one from your brief?"
- "Is this primarily development, research/content, project management, or a hybrid?"
- "What should exist after setup: instructions, project plan, content structure, code scaffold, git/remote, registry, changelog?"

If existing project:

- What works already?
- What feels unclear or brittle?
- Which files or folders are canonical, generated, scratch, or obsolete?
- Should I make suggestions first, or are small safe edits already approved?

If new project:

- What is the first real outcome this project should produce?
- What should future agents know before touching it?
- What should not be decided yet?

Mode accommodations:

- Development: ask about stack, commands, tests, deployment, secrets, data boundaries, release/change history.
- Research/content: ask about source material, evidence, citation style, privacy, output formats, editable source vs rendered artefacts.
- Project management: ask about stakeholders, milestones, decisions, meeting/task records, handoff format, review cadence.
- Hybrid: ask for primary mode and supporting mode(s); reflect that priority in AGENTS.md sections.

## AI Skills (01, 02, 03)

- What user phrase should trigger this skill? (description is load-bearing)
- Does it need to run across multiple agent tools (Claude Code, Cursor, Antigravity, Codex) or just one?
- Does it invoke or depend on other skills? (e.g., `project-changelog`, `skill-creator`)
- Will it bundle scripts, templates, or just be pure instructions?
- Does it need `~/local-models/` for model inference?

## Webapps (06, 10)

- Routing: react-router-dom, tanstack-router, file-based, or no routing?
- Data layer: fetch-to-JSON, Zustand, React Query, Supabase?
- Auth needed? If so, which provider?
- Deployment target: Cloudflare Pages, Vercel, GitHub Pages, self-hosted?
- Custom domain planned?
- Is this a fresh start or a Lovable export being evolved?

## Utilities (14)

- What invokes this? (CLI, shortcut, IDE extension trigger, cron)
- Distribution: `cargo install`, `uv tool install`, manual `.vsix`, Raycast Store, Homebrew tap?
- Does it need persistent state? Where?
- Does it wrap an existing tool or stand alone?

## Content pipelines (09, 13, 15, 16)

- Where is the canonical source material? (absolute path)
- Is it append-only, editable, or generated?
- British or American spelling?
- Voice/tone directives — should AGENTS.md lock a voice statement?
- Is there a rendering layer (website), or is the content the deliverable?
- Derived artifacts — JSON, PDF, HTML, other?
- Validation — JSON Schema, manual review, none?

## Consultancies (07, 08)

- Client name (for internal reference only — don't expose in public repos)
- Engagement timeline: one-off, phased, ongoing retainer
- Who reviews deliverables? How are they handed off?
- Confidential directories — what must stay gitignored?
- Any compliance constraints (GDPR, institutional review, etc.)?
- Deliverable format — report, data, web app, training?

## Forks (12, x-forks)

- Why forked? (local patch, reproducibility freeze, pending PR, study reference)
- Upstream URL and tag/SHA pinned to?
- Sync policy: pull weekly, frozen, on-demand only?
- Any local patches applied?

## Obsidian vaults (11)

- Sync mechanism: gitwatch, manual, Obsidian Sync, other?
- Is this a personal vault or shared?
- Plugins/themes that matter?

## Training & presentations (15)

- Session date(s) — useful for `_CHANGELOG/phases/` when coding-feature or implementation milestones matter.
- Audience — beginner, intermediate, expert? Which institution?
- Source material — transcripts, slides, existing notes?
- Deliverable — slides, handout, website, all of the above?

## Probing for `_CHANGELOG/` readiness

The user has a `project-changelog` skill for structured coding-feature/change history. Offer a `_CHANGELOG/` scaffold if:

- The project will add or change code features over time.
- The project needs implementation decisions, backlog, phases, or shipped-change narrative.
- The project will run a repeatable coding or build pipeline where worklog entries make sense.
- The project has multiple planned phases or milestones
- There are already decisions being locked (architecture, voice, schema)
- The user says "I'll forget why I did this in three weeks" or similar

Don't offer `_CHANGELOG/` for throwaway experiments, one-file utilities, or pure content vaults with no coding-feature history. Still create `_TASK-LOG/` for the operational work.

## Probing for `_REPOLOG` registration

Offer registration if:

- The user wants this synced across machines
- There's a GitHub remote planned
- The project will outlive this session

Don't register:

- Throwaway experiments in `x-experiments/`
- Forks (already handled under `x-forks`)
- Non-git content that never leaves the local machine
