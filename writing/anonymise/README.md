# anonymise

## Scope

Detect and redact personally identifiable information (PII) from text locally, on the machine running the agent, using OpenAI's open-weight Privacy Filter model (Apache 2.0). Runs in a few GB of RAM, no cloud APIs, no MLX required. Eight built-in PII categories: private person names, account numbers, private addresses, emails, phone numbers, URLs, dates, and secrets. Outputs masked text (default), pseudonymised text (consistent fake values for downstream LLM workflows), or structured JSON with span offsets.

TRIGGERS: Use when:
- User asks to redact PII, anonymise text, scrub names from a document, remove personal data
- User wants to "clean" text before sending it to ChatGPT / Claude / Gemini / any commercial LLM
- User asks to detect personally identifiable information (PII) in a corpus
- User asks to mask emails / phone numbers / addresses / API keys / credentials in logs or transcripts
- User asks to prepare survey responses, meeting transcripts, or research data for sharing
- User mentions OpenAI Privacy Filter, openai/privacy-filter, opf, or PII span detection
- User wants on-premises / local PII redaction (no cloud)
- User wants a deterministic, fast, repeatable redaction pass (sub-second on short text)

## Trigger

- Skill trigger: redact or detect PII in text, locally, with no cloud API call.
- Procedure, prerequisites, output modes and limitations: see `SKILL.md`.
