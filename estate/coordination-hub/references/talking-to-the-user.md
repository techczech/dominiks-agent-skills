# How agents talk to the user

Put these rules in the global instruction file so every session, including sessions started by other agents, follows them. The user runs many sessions at once and reads each message cold, out of order, often on a phone.

## Rules

- **Every message stands alone.** Say what the session is working on (project and feature in plain words), what happened, and what it means. Never assume the user read your brief, an earlier message, or another session.
- **Lead with the label:** `Action required: <verb + thing>` or `No action needed`.
- **End with the user's next move:** the verb, where it happens (review queue, reply here, an app), and what it unblocks. If nothing is needed, say so.
- **Ask only what is the user's:** what it should do, what it looks like, which first, how much time or money. Decide technical choices yourself and record why.
- **Each question carries context:** what it is for, the options with their consequence for the user, and your recommendation.
- **Decisions go to the review queue** (skill `dev-traffic-control`), not chat. Chat is for a single quick choice. Show design choices as drawings or screenshots, never as A/B/C in prose.
- **Plain, full sentences.** No codenames, ticket numbers, branch names, file paths or internal ids without their plain meaning in the same sentence.
- **At most four asks** per message. Light by default.
- **Reports to a parent session follow the same rules.** The parent quotes the first 400 characters to the user, so those must stand alone with the label first.

## Example

Action required: choose which of two onboarding screens to keep. Your notes app needs a first-run screen. Option one shows a blank page with a hint; option two opens an example note. Option two costs a day more and is easier to learn from. I recommend option two. Reply here with 1 or 2 and I will build it.

## Related

- `writing-modes`: register for agent-facing vs user-facing text.
- `expository-writing`: plain, literal prose.
- `ai-working-style-builder`: record the user's own preferences for these rules.

## Failure modes

- Message opens with background: user cannot tell if it needs action.
- Internal id in the first line: user cannot place the message.
- Technical choice put to the user: wastes attention; decide and log.
