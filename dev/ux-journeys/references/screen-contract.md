# Screen Contract

Rule. Every screen in every app gets a written contract before it is drawn. A journey says how a person moves. The contract says what each stop is for.

## The fields

| Field | Answers | Test |
|---|---|---|
| `viewer` | Who is looking at this screen? | A named role and a concrete person in a concrete situation ("Learner: Jana, on her phone, joined two minutes late"). Required in every app; one screen, one viewer role. |
| `arrives_knowing` | What do they already know when this screen appears? | What they have just seen, been told or done. Nothing assumed that the walkthrough has not shown them. |
| `expects` | What data do they expect to find here? | What they would look for before reading the screen. Each item is visible in `sees` or the gap is an open item. |
| `purpose` | What is this screen for? | One sentence, one job, in the user's words. No "and" joining two jobs unless they are one decision. |
| `why_here` | How did they get here, and why? | Names the moment or the previous action. |
| `achieve` | What are they trying to have happen? | A user's goal, not an app feature. |
| `sees` | What is on the screen, in reading order? | Real strings and counts. Every item has a `part` id matching the drawing. |
| `know` | What must they understand to act safely? | Each line changes what they would do. |
| `steps` | What do they do here, in order? | Each step has a `goto`: this screen or the next one. A step with no destination is unfinished. |
| `extra` | What could be here but is not needed for the purpose? | Each item has a `fate`: removed, moved (where to), hidden (behind what) or kept (why). |
| `states` | What else can this screen look like? | Covers first use, working, finished, empty, failed and unavailable, where each applies. |
| `evaluate` | How do we tell it works? | Observable checks a person or test can answer yes or no. No feelings. |
| `replaces` | What in the current app does this take over? | Omit only for a new app. |

## Hard rules

- **Rule one: protect the vertical space.** `sees` lists the bars above the content and their height; never more than two (title or tab bar plus one toolbar). Filters, scope, status and help are combined into that toolbar or moved elsewhere, never stacked as further rows (`app-design-elements`, layout rule one).
- **Every screen answers the five questions, in writing, before anyone is asked to test it:** who is the user here; what is this screen for; how does it serve the app's purpose; how does it move the journey on; what does the user need to know to use it. Skipped or answered badly is a failed review, and no test request goes out.
- **Every screen names its viewer.** In an app with more than one role, a screen belongs to one role and shows nothing that role does not need. A control for another role is never hidden or disabled on this screen; it is absent.
- **Nobody is told where to click.** When another person's action moves the app on (a teacher starts an activity, a reviewer approves), the viewer's screen follows by itself. The next thing they should do is already in front of them.

- **One screen, one purpose.** If the purpose needs two sentences, it is two screens. Controls that serve another purpose are listed in `extra` and given a fate.
- **Every control serves the purpose or is justified in `extra`.** A control in the drawing that is in neither `sees` nor `extra` fails review.
- **User language.** Screen names and purpose lines use the user's words: "Find", not "Retrieval"; "Make searchable", not "Index". Engine vocabulary is a failure unless it is the user's own domain term.
- **Pages are not parts of the system.** A top-level place is named after what a person came to do. Name it after an engine component and it fails.
- **Audit the current app the same way before redesigning.** Count the jobs on each screen. State the result in the review.
- **The app comes first.** Before the screens, write one sentence for what the app is for, name the user, and outline every step from arrival to finished. Every screen belongs to a step. A step with no screen and a screen with no step are both open items.

## Apps with more than one role

When more than one person uses the app at once (teacher and learners, presenter and audience, owner and reviewer), the walkthrough runs on **moments**, not screens:

- Top level `roles`: each role with its id and name. Each screen has `role`.
- Each journey step is a moment: `by` (the role who acts), `does` (what they do) and `screens` (one screen per role, showing what every role sees at that moment).
- A step whose action changes another role's screen lists it in `causes`: `[{"role": "learner", "screen": "l-activity-open"}]`.
- The walkthrough shows every role's screen side by side for each moment. Clicking a control in one role's drawing moves every role to the next moment.
- The step outline covers every moment from before the session to after it: before, arriving, waiting, each activity, interruptions (late arrival, lost connection, reload, wrong link), ending, afterwards (homework, practice, coming back next time).

## Commitments

Top level `commitments`: the things that must hold without exception, in the user's words, each with an id. The walkthrough opens with them. Every screen's `evaluate` cites the commitments it checks; a commitment no screen checks is an open item. Build tickets and regression tests cite them too.

## Step-by-step reviews are interactive HTML

Any step-by-step UX review put in front of the owner is an interactive HTML walkthrough, never prose, static images or a chat list.

- Build it with `scripts/build-screen-walkthrough.py` from a contracts JSON and one drawing per screen. See `assets/template-screen-walkthrough.html`.
- **The drawing works.** Clicking a control in it follows that step's `goto`.
- **The contract sits beside the drawing.** Pointing at a `sees` line highlights that part of the drawing.
- **Each state is switchable.**
- **Each screen has its own verdict:** Clear or Not clear, plus a note, judged against `evaluate`. The end of the walkthrough lists all verdicts and notes.
- **The walkthrough opens with the purpose, the users, the commitments, the step outline and the audit of the current app.**
- **JSON shape** (all optional; no `roles` = single-role walkthrough as before):
  - screen: `viewer`, `arrives_knowing`, `expects` (string or list), `role`, `checks: ["C1"]`.
  - top level: `commitments: [{id,text}]`, `roles: [{id,name}]`.
  - journey step: `by` (role id), `does`, `screens: {roleId: screenId}` (array still accepted), `causes: [{role,screen}]`.
  - Builder fails on unknown commitment, role or screen id, or a screen under the wrong role.
  - With `roles`: route `#moment-<n>` shows all roles side by side, arrows move between moments, a `data-goto` in a column goes to the next moment showing that screen for that role. Worked example: `assets/example-two-roles/`.
- Delivered through `dev-traffic-control`: `kind: doc-review`, embedded with `html src`, ending in decision blocks.

## At each stage

- Before visual design: contracts are written with the journeys (`ux-journeys` step 3) and corrected by the user.
- Visual design: every round draws the contract. A new control needs a contract change first.
- Build: tickets cite the screen id. A builder who needs a control that is not in the contract stops and asks.
- After build: `cognitive-walkthrough` checks the built screen against `purpose` and `evaluate`.
- Small change inside a locked screen: update that screen's contract in the same change.
