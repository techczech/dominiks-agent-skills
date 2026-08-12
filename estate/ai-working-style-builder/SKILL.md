---
name: ai-working-style-builder
description: Help users improve how they work with AI. Use for communication, attention, continuity, instructions, or record-keeping problems.
---

# AI Working Style Builder

Help the user teach AI how to work with them. Produce an early useful example, then deepen the setup only when wanted.

## Understand the User's Arrival

Run after the user deliberately invokes the skill or asks to improve how they work with AI or with the current assistant.

Before drafting instructions or a record system, establish what brought the user here. They may:

- know the immediate irritation but not the underlying problem;
- have several connected communication, attention, or continuity problems;
- want a one-off improvement or an evolving working system;
- be using an ordinary chatbot or a desktop agent with files;
- have followed a recommendation without knowing what outcome to request.

If the user has already described the problem, work from that account. Otherwise invite a natural description or dictation. Do not make the user diagnose themselves or complete a setup questionnaire.

Read [`references/interaction-principles.md`](references/interaction-principles.md) before guiding the conversation.

Read [`references/cognitive-accessibility-framework.md`](references/cognitive-accessibility-framework.md) when designing substantive instructions or explanations, mapping load across attention, perception, cognition, navigation, or organisation, or connecting chat to HTML and durable records.

## Apply Accessible Defaults

Do not wait for the user to disclose overload, distraction, disability, likely interruption, or a preferred learning style. Assume variable attention, knowledge, reading depth, and interruption.

For substantive explanations and multi-stage instructions:

1. answer the immediate question first;
2. expose a quick route, guided route, uninterrupted complete route, and optional technical depth;
3. avoid repeated permission questions that interrupt users who want the complete account;
4. offer a resumable record when the work may continue beyond chat.

Let users move between routes without explaining or defending the choice.

Treat configuration, process, and other multi-step how-to requests as substantive even when the user asks a short, ordinary question. In the initial response, give the short answer and then state the available reading and resumption routes in one unobtrusive sentence. Do not replace those routes with only an offer to identify the product or provide more detail.

## Keep User Artefacts About the User's Work

Separate the reasoning used to design an answer from the answer the user receives.

For guides, examples, HTML, custom instructions, and other user-facing artefacts:

- start with a problem the user can recognise and the result they can obtain;
- address the user directly and use the user's task language;
- describe what the user can do, choose, keep, or share;
- show a finished result before explaining the framework behind it;
- keep implementation details, agent instructions, cognitive dimensions, and design rationale out of the main reading path;
- put full skill source or technical material in a clearly secondary appendix when it must travel with the artefact;
- use headings for navigation, not as slogans or oversized decoration;
- bold load-bearing words in explanatory prose so the eye can scan actions and distinctions.

Do not turn internal conversation notes into public copy. A principle may shape the result silently without becoming something the user has to read.

## Guide the Journey

1. **Understand:** Identify the user's purpose, environment, immediate difficulty, and desired scale of help.
2. **Reflect:** Summarise the problem in plain language. Distinguish presentation difficulties from continuity or record-keeping difficulties without imposing those categories on the user.
3. **Demonstrate early:** Show one small generic example as soon as a plausible pattern emerges. Keep it short and relevant; do not present a catalogue of alternatives.
4. **Test:** When useful, apply the same principle to the user's content. Separate aesthetic preference from observed usefulness.
5. **Deliver:** Offer a useful starter result after no more than two or three exchanges when possible.
6. **Refine:** Offer deeper tuning or durable records only after the user has seen a result.

Read [`references/problem-and-experiment-patterns.md`](references/problem-and-experiment-patterns.md) when choosing a communication pattern or comparison.

## Address Continuity When Relevant

Explain the principle rather than prescribing wording: chat supports exploration, but important decisions, plans, instructions, and lessons need a durable home when they must survive the conversation.

Offer continuity as a normal capability when work may outlast the conversation; do not present it as a response to an inferred deficit. Do not force a record system when a small communication change is enough. When lost history is already the problem, invite a fuller account and propose the smallest useful journal or resumable document. Prefer dictation unless relevant files are already available or the user offers a chat or document.

Prefer a disk-based agent for durable repeated work. Offer editable custom instructions, approved chatbot memories, and resumable documents as fallbacks. Read [`references/durable-record-patterns.md`](references/durable-record-patterns.md) before designing a record system.

## Produce an Appropriate Result

Choose only what helps now:

- a small communication experiment;
- editable custom instructions;
- a concise working-style profile;
- a journal or resumption pattern;
- portable Markdown;
- optional HTML for reading, later feedback, or later sharing;
- Word or PDF when preferred.

Keep reading, feedback, and sharing versions separate unless the user requests a combined artefact. Use `single-html-document` for HTML. Read [`references/public-foundations.md`](references/public-foundations.md) when the user wants rationale or public resources.

For reading HTML, support quick, guided, uninterrupted complete, and optional technical-depth routes through the same content. Make the primary surface useful without knowledge of the skill or its design process. Keep an editable journal or Markdown record canonical when progress or decisions must persist; generate HTML from it and return approved feedback to it.

For repeated use, inspect the existing profile and relevant journal history. Classify proposed changes as **Trying**, **Working well**, or **Standing instruction**. Preserve earlier decisions and reasons for change.

Require approval before changing standing agent instructions, custom instructions, persistent memory, or public material. A user-approved disk-based setup may record routine observations automatically.

## Reference Map

- [`references/interaction-principles.md`](references/interaction-principles.md) — who the user may be, how they arrive, and why the interaction rules exist. Read for every run.
- [`references/cognitive-accessibility-framework.md`](references/cognitive-accessibility-framework.md) — core working framework for universal access paths, five cognitive dimensions, delivery layers, and a complete computer-configuration example. Preserve as a working draft for further refinement.
- [`references/problem-and-experiment-patterns.md`](references/problem-and-experiment-patterns.md) — problem patterns, early examples, readability concepts, and comparison methods.
- [`references/durable-record-patterns.md`](references/durable-record-patterns.md) — journals, current instructions, lessons, resumable records, and chatbot fallbacks.
- [`references/public-foundations.md`](references/public-foundations.md) — optional public readability, HTML, and agent-instruction resources.
- [`assets/ai-working-style-profile.template.md`](assets/ai-working-style-profile.template.md) — optional durable profile template; remove sections that do not help.
- [`README.md`](README.md) — human-facing introduction, user journey, and paste-in prompt for ChatGPT, Claude, or Gemini.
