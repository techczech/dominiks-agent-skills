# Providers And Privacy

Use this reference when the user asks about agent-assisted work, API keys, Codex, Claude Code, OpenAI, Google, Gemini, web lookup, consent, or what may be shared.

## Modes

`agent-assisted` means Codex, Claude Code, or another Agent Skills-compatible agent may produce real translations and back-translations inside the interactive session. This mode does not require separate API keys, but source text is still being shared with the active agent service according to that tool's terms and settings.

`api-assisted` means scripts may send approved source text to approved model providers. This mode requires explicit consent in the project workspace.

`manual-review` means translated materials already exist and Codex helps with audit records, reviewer instructions, or feedback packages.

`codex-assisted` is accepted as an older name for `agent-assisted`.

## Agent-Assisted Translation

Agent-assisted translation is not a dry run and must not produce dummy text. If the active agent translates a segment, record it as a real agent-produced translation with:

- agent/tool name, such as Codex or Claude Code
- visible model name if known
- date
- source segment ID
- target language
- prompt or instruction summary
- output text
- limitations

The same active agent may do a simple back-translation check without API keys. When that happens, label it clearly:

```text
Back-translation type: same-agent check
Independence: not independent; forward translation and back-translation used the same agent/model context
```

Do not present same-agent back-translation as independent evidence. It can still help catch omissions, obvious meaning drift, or formatting mistakes.

For stronger separation without API keys, use two agent tools when available. For example, Codex may produce the forward translation and Claude Code may perform a blind back-translation in a separate workspace or thread. Record both agents and keep the back-translation prompt blind to the source text.

## Agent-Only Trial Route

Use this route when researchers want to try the workflow before API setup, budget approval, or provider consent for scripted calls.

Agent-only does not mean fake. It means the active agent or a second named agent produces real translation artefacts inside the interactive tool.

Recommended trial:

1. Select a small, low-risk source sample approved for agent use.
2. Record consent for the active agent service in the project workspace.
3. Segment the sample and assign stable segment IDs.
4. Produce a forward translation with the active agent.
5. Run a critique pass against concrete language and document risks.
6. Reconcile the translation and preserve the decision notes.
7. Run a same-agent back-translation check, or use a second agent/tool for a blind back-translation if available.
8. Build a researcher-facing package that clearly labels provenance and limitations.
9. Optionally build an external-reviewer package only from fixed candidate text.

Required labels:

- `agent-produced-forward-translation`
- `agent-produced-critique`
- `agent-produced-reconciliation`
- `same-agent-check` or `independent-agent`
- `api-not-used`

Never describe an agent-only route as equivalent to an independent multi-provider API workflow. Present it as a practical researcher trial for process fit, segmentation, reviewer questions, terminology risk discovery, and early feasibility.

If the researcher wants to continue after the trial, decide whether to keep agent-only, add a second independent agent, or move to explicit API-assisted provider calls.

## Keys

Never hardcode keys in project files.

Prefer environment variables:

```bash
export OPENAI_API_KEY="..."
export GOOGLE_API_KEY="..."
```

If the user uses a password manager or secret manager, help them expose keys only to the shell session that runs the scripts.

## Consent

Before live provider calls, create `config/provider-consent.yaml` from the generated example and confirm:

- which source documents may be sent
- which providers or agent tools may receive them
- whether web terminology lookup is allowed
- whether reviewer feedback may be sent to providers
- whether back-translation is allowed
- retention and deletion expectations

If consent is missing or vague, stop and ask for clarification.

Agent-assisted work also needs a consent record. It may be simpler than API consent, but it still must say which source documents may be shown to the active agent tool and whether a second agent/tool may receive target-language text for blind back-translation.

## Usage And Cost Reporting

Generation APIs usually return usage metadata, not an exact billed dollar amount for each request. Treat token-derived costs as estimates unless they have been reconciled against provider billing data.

For live API-assisted runs, preserve the provider response fields that support closer estimates:

- OpenAI cached input tokens: `input_tokens_details.cached_tokens`, or older `prompt_tokens_details.cached_tokens` when present.
- Google/Gemini cached input tokens: `cached_content_token_count`, `cachedContentTokenCount`, or newer cached-token usage fields when present.
- Thinking/reasoning tokens: count them as output when the provider reports them as part of billable output usage.

Record the configured rates, pricing source/date, currency, provider, model, call stage, and whether cached-token pricing was applied. Keep the exact usage and estimate values in CSV/JSON. For researcher-facing dashboards or reports, round displayed currency values for readability while keeping the exact machine-readable export.

Provider billing or admin APIs may report delayed or aggregated costs. If a project later reconciles estimates with actual billing exports, preserve both values and label the source of each number.

## Sharing Rule

Do not include these in reviewer packages unless explicitly approved:

- API keys or secret names
- local machine paths
- private source documents beyond the approved review context
- raw prompts
- raw provider logs
- unpublished variants
- internal notes about uncertain or failed generations
- reviewer feedback not consented for provider use

## No Dummy Outputs

Never create placeholder translations, sample back-translations, or fabricated reviewer feedback to make an artefact look complete. If a real translation has not been produced yet, write `not generated yet` or `blocked pending consent` instead.
