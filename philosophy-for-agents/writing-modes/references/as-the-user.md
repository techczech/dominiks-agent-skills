# Writing Mode: AS THE USER (author-faithful)

Target: text that goes out under the user's name as if they wrote it — reports, proposals, briefings, emails, abstracts, TLDRs, bios, posts, slide text, captions, public pages, report vignettes, and messages the agent drafts for the user to send. Decided by destination, not medium: AS THE USER even when it appears inline in chat.

If text could be copied into the user's report, proposal, briefing, public page, email, slide deck, or other authored artefact, classify it as AS THE USER before drafting. Do not treat report notes, evidence callouts, or vignettes as FOR THE USER merely because they are being edited in a workspace.

## Voice sources

- If the user has a voice guide, style sheet or writing samples, load them before drafting; they govern voice on top of this file. Name where they live in `local.md`.
- Without a voice source, write plainly in the register of the user's own source material and say in chat that no voice guide was available.
- Follow the user's spelling convention and punctuation habits as their samples show them.

## Guardrails

- Content is the user's — from an original source, their prompt, or their dictation. Voice is *how* it reads; the content is always theirs. Never invent phrasing, conclusions, examples, or claims they did not give.
- Source required: the user's prior writing, dictation, or bullets. No source → ask; do not proceed.
- Ask on every gap; flag anything contestable or that could misrepresent them. Surface controversy rather than smoothing it over.
- No editorial meta-framing in the artefact (no "less formal version" preamble, no "Informal Version" title, no notes on what changed). Editorial decisions go in chat.
- Three passes before delivery: (1) faithful to their content; (2) their voice; (3) AI tells, padding, and unrequested claims removed.

## Forbidden phrases & structures — strip on sight

Scaffolding to strip unless the user's own samples use it (state the claim directly instead):
- "not only… / not only that… / no longer only that…"
- "not just X, but also Y"
- "The aim is not… It is…" — **never use this.** State the actual aim directly.
- "The point is not that…, the point is that…" / "The point is not X but Y"
- Faux-definitive connectors that turn a source into a rhetorical function: "X adds the caution", "Y gives the answer", "Z provides the solution", "X sets the pace of response", "The practical answer is…".
- Watch the pattern `Name + definitive verb + the + abstract noun`: "[a named author] sets the pace of response", "X provides the answer", "Y gives the caution". Use a reporting verb: "[the author] says:", "Y argues:", "Z describes:".
- Do not ban ordinary narrative movement globally. "The episode then moves..." can be fine elsewhere; avoid it in executive report prose when it sounds like story narration rather than analysis.
- Rule-of-three triplets used only for rhythm — "X, Y, and Z" padding.

Inflated / generic diction to cut:
- delve, tapestry, landscape, realm, navigate the complexities, testament to, underscore, robust, seamless, game-changer, supercharge, unlock, harness, elevate, foster, pivotal, crucial, vibrant, leverage (as filler).
- Hype openers: "In today's fast-paced world", "In an era of", "Now more than ever".
- Throat-clearing: "It's important to note that", "It's worth noting that", "Needless to say", "When it comes to", "At its core".
- Empty closers: "In conclusion", "Ultimately", "At the end of the day", "In summary".

Vague planning nouns:
- Avoid "shape" and the like — use the concrete word: format, programme, session, route, plan, offer.

Quotes and evidence:
- Use full, context-bound quotes. Do not pull half-sentences that hide what the source was actually saying.
- Prefer giving the user enough quoted source material to trim over deciding in advance which fragments matter.
- Shorten around a quote with prose, not inside it. If a quote must be shortened, make the omission explicit or choose a different complete sentence.

Keep the user's deliberate moves — they are not tells:
- Some patterns that look like AI tells are the user's own habits: em-dashes, rhetorical questions they answer themselves, scare quotes, particular stock phrases. Check their samples before stripping one, and record the confirmed list in the voice guide or `local.md`.

## Outbound email default

- Keep replies on the user's behalf short: one brief thanks or acknowledgement, then one clear ask.
- Let the source email carry its own context. Include offer detail only when needed for the ask, and avoid extra promises or secondary requests unless the user explicitly wants them.
- For permission to publish feedback, ask about one specific quote and its attribution; seek separate permission for third-party comments later.

## Public artefacts

Public pages, sites, decks, handouts, bios, product copy are AS THE USER unless explicitly marked internal. Renderers consume only fields meant for public display.

Reports, proposals, briefings, source notes intended for reports, and evidence vignettes are AS THE USER unless explicitly marked internal or agent-facing.

Never leak agent-facing judgement or process language into them — unless the user explicitly asked for it:
- evaluation labels: `candidate`, `strong candidate`, `draft`, `needs work`, `cleanest`, `best`, `my choice`, `I decided`, `this works because`.
- meta-descriptions of the work itself: "less complex", "more readable report", "simple explanation", "simplified version", "streamlined", "cleaner version", "easier to read", "improved", "at a glance".

Substance standard: `expository-writing` skill — the forbidden lists above are tripwires; the actual standard is determinate propositions (clarity + exposure checks), no decoration or journalistic register unbidden, Potter-style exposition without authorial persona.

Depth: the user's voice guide or voice skill, if they have one — full voice procedure, style guides, and writing samples.
