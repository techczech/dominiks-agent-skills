---
name: design-first-dev
description: "Design-first process for software with a UI: PRD and user journeys, divergent design rounds, a locked high-fidelity mockup, build to that mockup, live verification of the core path, and a full-features quality gate. Use before writing any plan or code for an app, a feature or a redesign."
---

# Design-First Development

If `references/local.md` exists, read it: it holds the local conventions for this workspace and overrides this file where they differ.

Why this exists: in one real build, six hours of plan-faithful, review-gated subagent execution produced an app its owner rejected on sight. Every task passed spec review; the product failed because the spec contained no design and nobody ever asked "would a person want to live in this?". Execution pipelines verify compliance, not quality. Design is the quality gate, and it comes first.

The process is a **UX → visual-prototype feedback loop**: user journeys are the UX half (what the user is trying to have be true, and the path there), mockups the visual half (what a surface on that path looks like). A static mockup alone specifies a surface with no journey to or from it — one app went through three redesigns on exactly that gap. For small surfaces inside already-locked journeys the loop collapses to a single point (one journey sentence, one frame); neither half is ever skipped silently.

## Standing rule — the decision trail

Before any product work in a repo, read its `docs/adr/`, its `CONTEXT.md` (the glossary), **and its roadmap** — the roadmap is where postponed features wait, and a fix pass that never reads it re-invents or re-postpones them blind. Never silently contradict an accepted ADR — reopen it explicitly or comply. Use the glossary's exact terms in PRD language, UI copy, and code identifiers. Every product repo gets this scaffolding (`docs/adr/` + `CONTEXT.md`) as standard — set it up at Gate 1 unprompted, and keep it current as terms and decisions emerge.

One caution from the failure that created this skill: the rejected build had an excellent ADR trail and still produced a rejected product. Decisions feed design; they never substitute for it.

**Design artefacts live in the repo, never in a scratchpad.** Mockups, direction candidates, PRDs and the rendered screenshots beside them go in `docs/design/<date>-<topic>/` and are committed in the turn they are produced — every candidate, not only the winner, plus which one the user chose. A design is what the build is judged against, so it must outlive its session, diff when it changes, and be findable by an agent starting cold. Scratchpads are for genuinely disposable state: dispatch briefs, builder logs, probes. Learned on a project where the standalone PRD and several renders existed only in a session's temporary scratchpad and were rescued on the very day the plan became "find the designs and show them to me". When taking over a thread, move any design artefact out of a temp path before working with it.

**A locked design that was never built is a defect, not a backlog item.** One app shipped for weeks without the shell design its own ADR had locked, because it was deferred once and never rescheduled — and every subsequent round of user-reported "missing" features traced back to that. When a design is locked, the work that realises it is scheduled then, or the lock is explicitly reopened.

## The sequence

Never skip a gate. Never reorder them. Code is the last step, not the first.

### Gate 1 — PRD and user journeys, on the domain model

Pin down, in writing, before any design work: who it is for, the jobs it does, the flows, and **every screen and state by name** (including empty states, error states, onboarding, settings). A feature list is not a PRD; a PRD says what the experience must feel like, screen by screen.

**Lock the user journeys before any visual design** — run the `ux-journeys` skill: name the aims, enumerate the situations, storyboard divergent candidate journeys for the user to correct (propose, don't ask — the user recognises rightness faster than they can specify it), and lock each with its *right-when* condition. Storyboards are **half visual, half textual** — rough sketches with one-line captions, never prose walls and never polished mockups. Every feature links to the journey it serves; a feature serving no journey is flagged, not silently kept. Locked journeys are design artefacts (`docs/design/<date>-<topic>/journeys.md`, committed same turn). The `cognitive-walkthrough` skill is the closing check after build that the app still walks these journeys — it never substitutes for locking them here.

Work the decision machinery as the language crystallises: write the PRD through a clarify loop and a review; pin terms into `CONTEXT.md` as they settle; interview the user to sharpen the PRD; and record each decision that passes the three-part test (hard to reverse, surprising without context, a real trade-off) in `docs/adr/` at the moment it is made. The PRD cites the ADRs it rests on. If you have skills for PRD authoring, domain modelling or planning interviews, use them here.

### Gate 2 — Design rounds (the user comments; nothing is built)

Produce **multiple genuinely distinct design options** for the user to react to. Distinct means different geometry and personality, not one design in several palettes. Two sanctioned forms — ask which, or read the request:

- **Image-generator rounds** (breadth, cheap iteration) — follow the `image-to-design` skill's folder discipline (design plan folder, content file as wording authority, versioned rounds). The brief given to the image generator is direct instruction only: what the app does, which screens to produce, where to save them as **absolute paths**. Do not prescribe layout, palette, typography, or aesthetic territory when the point is harvesting the generator's ideas — describe the function, name the screens, let it design. No meta-prose ("invitation", "surprise us"), no behaviours a static image cannot show.
- **HTML design directions** (when interaction must be felt) — 3+ single-file directions. They must read as **application designs, not websites**: panels, splitters, toolbars, tool density, panel-local scrolling — never hero sections or page rhythm.

Design rounds consume the decision trail: a direction that violates an accepted ADR is out of bounds unless the user explicitly reopens that ADR.

**Model tier in this gate.** Divergent candidate rounds can run on a mid-tier model at moderate effort: the work is output-heavy, disposable, and judged by the user, so a weak candidate costs a glance. The cheapest fix-only tier never does design. Two conditions, both load-bearing. Dispatch **one agent per direction, each with its own named direction and constraint set** — a single cheap generator asked for "five ideas" returns five versions of the same templated mean (card grid, centred hero, gradient, emoji icons): you pay for variety and receive one option. **Inspect the set before showing it.** If the candidates differ mainly in colour and typography rather than in geometry and personality, rerun the round on the top tier instead of presenting it. Never ask the user to diagnose a weak round or to report it in agreed words — they say the options look the same, or say nothing, and the agent owns the cause and the fix. And ship the standing taste rules in each brief as hard constraints rather than "make it good": application not website, bounded sections, 70/30 with negative space left, real icons from an established set, and a large identity badge top-left so directions can be named when the user opens them out of order.

**The high-fidelity locked mockup is always top-tier, and is re-authored rather than promoted.** Do not polish a cheap candidate into the spec. Once locked it is what every downstream task cites, so a mistake in it surfaces late and in built code — this is the gate the founding rejection came from.

Iterate on the user's comments — they will pick one, or ask for elements of several combined. Then build **one high-fidelity interactive HTML mockup** of the chosen direction and iterate on it until the user declares it locked. The locked mockup is the design spec for everything downstream.

**A frame shows one state; it does not decide the others.** A user reviews a mockup as a *hint at a sensible experience*, not as a literal contract — so a builder who reads one frame as complete ships the wrong thing and is not wrong to have done so. In one app a media playback bar was drawn once, visible, and shipped permanently visible; nothing in the frame said "always". Consequences, all binding:

- **The locked mockup enumerates every state of every surface** — including the state where the thing is absent, which is the one that gets skipped. Present · empty · loading · refused · mid-operation · finished. A surface drawn in a single state is an unfinished drawing, not a finished decision.
- **Absence is invisible to the reviewer.** The user cannot comment on a surface that is not in the drawing and will not notice that it is missing, so an omission survives review by default. Every round therefore ships a **written list of the surfaces and states being drawn**, reviewed alongside the pictures, plus an explicit *what this does not settle* section. The list is the only part of a design round that can catch a gap.
- **Design rounds render journey states.** The surfaces-and-states list derives from the locked journeys (Gate 1): the mockup set covers every journey's states, not a home screen plus whatever suggested itself. A journey state no round has drawn is an open item, never a builder's guess.

**Record the lock as an ADR**: the chosen direction, the rejected alternatives and why, and the taste rules that emerged from the user's comments (e.g. "light is the identity, dark is an option"; "application, not website"; "no chat-bubble surfaces") — so no later round, session, or agent re-litigates them. Vocabulary that emerged (names for surfaces and interactions) goes into `CONTEXT.md`.

### Gate 3 — Plan and build, to the locked design

Only now write the implementation plan, with whatever planning and execution skills you normally use. Every task that touches a surface cites the locked mockup **and** the ADRs it implements; deviation from either is a decision for the user, not the implementer. An implementer who finds plan text conflicting with an ADR stops and escalates rather than choosing — that conflict class appeared twice in the founding build and survived only because a reviewer happened to catch it.

**Do not spend plan or ADR text on trivia — above all, which letter a shortcut gets.** Every command is palette-listed and rebindable (Gate 5), so a specific keystroke is never load-bearing and never worth an escalation. Assign a sensible default, note it once in the command registry, and sweep the whole keymap for collisions and ergonomics in one pass before release. The same applies to any decision the user can change in settings in two seconds. Plans spend their words on **what the thing does and how it is built**; a plan that litigates keystrokes has mistaken volume for rigour.

**Name every milestone and gate.** A plan is read weeks later and out of order, so `M9` or `Gate 4` alone is unreadable. Give each a short descriptive name at the point of definition and carry it every time: *M9 — the record*, *Gate 4 — live check with the user*. Bare identifiers are for the file tree, never for prose the user reads.

### Gate 4 — Live verification, mid-build

The product's single most load-bearing user path (sign-in plus the core action, whatever it is) is verified **end-to-end, live, with the user in the loop** as a build gate. If it needs their account or their hands, stop and ask them mid-build. Never ship around it, never defer it to a checklist of "owed manual checks" — that is how a non-working core path reached "done" in the founding build.

### Gate 5 — Quality gate: full features only, no shortcuts

This gate governs **done and shipped**, not first sight: an installed build may reach the user earlier as a **provisional preview** — put in front of them at the earliest usable moment, never called done or finished. The two rules compose; they do not conflict.

Nothing is declared done, demoed, or shipped until it passes ALL of these. Failing any one is grounds for rejection of the whole milestone, regardless of what any plan says:

- **No MVPs, ever.** Every feature ships full and finished as designed, or not at all. "Polish later" is a lie — polish is the product. If scope must shrink, cut whole features cleanly; never ship a rough or reduced version of anything.
- **The app has Settings — no app ships without them.** From the *first* release, not retrofitted, and carrying at minimum: **the version number read from the running build**, **a shortcut-assignment surface covering every command**, and the app's real preferences. One-time setup — auth, API keys, model choice — lives here or in onboarding, never as primary UI chrome. A build that reaches the user without a settings window fails this gate on its own.
- **`⌘/` opens the keyboard cheat-sheet** listing every shortcut, and it is current. `⌘/` rather than a bare `?` because it must work while the user is typing — which is exactly when a key is forgotten. `?` may remain a secondary trigger outside text fields.
- **Every click target has a keyboard path.** Full parity — if it can be clicked, it can be keyed, and the key is discoverable.
- **Every content operation has an agent path — the content-verb law.** If the app can do it with content, the agent can do it: each content operation is a typed headless verb the UI and the agent both call. **Every feature design includes a verb table** — verb, typed inputs, posture floor (direct / proposal / approval), context contribution; an **agent journey** is written only when the agent is a primary user of the feature. UI chrome is excluded by class with a declared reason; view configuration and settings verbs follow in later phases. Posture rule: the verb sets the floor, the request's intent can raise the gate (an advisory ask returns a proposal even for a direct-eligible verb), never lower it. Retrofit is audit→roadmap with a touch-rule for content verbs — never a gate on unrelated work.
- **Every command is in the command palette, and every shortcut is reassignable.** The palette is the complete command surface, not a search box over a subset; the keymap lives in settings and the user can rebind anything. Assume from the first design round that a command needs a shortcut — that is the default, never a per-command decision.
- **The universal keymap — reserved in every app, never repurposed.** The **command layer is unconditional and done right in every app**: palette, registered commands, keyboard parity, rebinding, cheat sheet, settings, contextual actions — an app missing any of those fails this gate. The **switcher and preview/inspector exist only when the locked journeys need them**; find/search are **default-on** and omitted only with a recorded reason. An absent surface leaves its chord unbound, never repurposed.

  | Binding | Surface |
  |---|---|
  | `⌘⇧P` | **Command palette** — the complete command surface |
  | `⌘⇧K` | **Navigation switcher** — jump to a thing (project, file, run, thread) |
  | `⌘K` | **Contextual actions** — what can be done to the current selection |
  | `⌘P` | **Preview / inspector sidebar** |
  | `⌘F` | **Find in the current document** |
  | `⌘⇧F` | **Search across everything** |
  | `⌘,` | Settings |
  | `⌘/` | **Cheat sheet** — must work while typing; `?` alone is unreachable inside any text field |

  The palette **displays each command's current shortcut beside it**, and `⌘⇧,` **rebinds the highlighted command in place** — Raycast's model. Rebinding never requires a trip to a settings page. Cross-app muscle memory is the whole point: an app that puts the switcher on `⌘K` because that is the web convention has broken the contract.

  **Adoption is opportunistic, not a campaign.** Do not retrofit shipped apps on a schedule. Each adopts the contract in full the next time its chrome, keymap or command surfaces are being worked on anyway; new apps and new surfaces comply from the first design round.
- **No phoned-in surfaces.** A bare textarea with a Send button is anathema — agent/chat surfaces are designed experiences; empty states and error states are designed, not defaulted.
- **Designed, not "distinctive".** The bar is that design happened, using established UI/UX patterns properly — minimalist done well beats distinctive every time; slapdash is the sin. Concretely:
  - Real icons from an established set (e.g. **lucide-react**) — never letters standing in for icons, never model-drawn SVG glyphs.
  - Buttons are designed controls (icon + label at proper scale and hierarchy), not big boxes with big text.
  - Lists are searchable **and** sortable; trees and outlines are collapsible; inputs have their expected affordances (search glyph, clear button).
  - **Settings are searchable, and every settings change is recorded in an in-app settings changelog** — old → new value, when, and a per-entry Reset — so a tweak the user forgot making is one click to find and undo. Every app gets this.
  - Errors are human-readable with a recovery action — never raw exception text in the UI. No internal jargon (model ids, config values) as chrome.
  - No permanent onboarding copy ("How this works") living in the interface; a design that needs a resident explainer has failed.
  - No duplicated information (a title shown three times is two design failures).
- **Sections must be bounded, not implied.** If panels are separated only by hairlines inside a narrow luminance band, the user does the grouping work with focus they should be spending on content. Widen the contrast ladder (stage → surface → row), make section headers solid bars, and give the primary panel genuine emphasis.
- **Design to the two scan axes** (full version in the `readability` skill, `references/web-readability.md`):
  - **Left→right is the reading axis** (depth, may run to two lines, larger type). **Top→bottom is the scanning axis** (speed, short rows, strong rhythm).
  - A scannable list must be **narrow enough that a row reads without a horizontal journey**. Title on the left with its status pinned 700px away at the right edge is the classic failure — the eye traverses dead space every row and loses the vertical thread.
  - Default split for dashboards and mixed-density surfaces: **~70% left for what earns depth, ~30% right for what needs attention only sometimes.**
  - **Which side gets the important thing depends on whether the eye should start there or arrive there.** Primary work goes **left** (eyes begin there and should settle, not be led onward); a TOC/index/rail goes **left precisely because** the eye leaves it for the deep read on the **right**. Resolve this per surface before choosing a side.
- **Light UI is the identity; dark mode is a settings option**, never the brand.
- One spelling convention in all UI copy, chosen per app and applied consistently.

Walk this list explicitly at the end of every milestone and record the result. These are also design inputs — build them in from the first design round, not as a retrofit. The reference for what failing looks like: the rejected window from the founding build (a letter "O" as an icon, text-box buttons, an unsortable file list, a raw IPC error in a pill, API-key fields as the agent panel's face, a textarea + Send composer, a shortcut cheat-sheet crammed permanently into the status bar).

## Model policy

Fix the role assignment once for the whole workspace and do not re-decide it per project; do not argue model choice inside a plan or ADR. The shape that matters:

- One top-tier model plans, designs, decides and adjudicates. Builds go to a mid-tier implementer by default and to the top tier for anything security- or write-path-bearing, anything needing judgement the spec does not supply, and the locked mockup.
- **A model never reviews its own build.** Review of architecturally sensitive code goes to a different model, ideally a different family.
- **The cheapest tier is the fix lane only**: a change against a named failing test or a named visible defect, checkable in one look or one run. Never key functionality, never a seam or schema, never design, never prose. When in doubt, it is not a fix.

This policy overrides any execution skill's cost-optimising model guidance.

## Composes with

- `ux-journeys` — locking the user journeys at Gate 1, before any visual design; `cognitive-walkthrough` is the post-build check of the same questions.
- `image-to-design` — the folder and versioning discipline for image rounds.
- `readability` — the scan-axes rule in full.
- A frontend design skill, if you have one — the quality bar for HTML mockups.
- Planning and execution skills — Gate 3 only, never before a locked design.
