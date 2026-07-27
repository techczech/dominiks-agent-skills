# Limitations and Risks

A working summary of what Privacy Filter does badly and where it should not be trusted alone. The underlying analysis is OpenAI's, set out in sections 3.2 and 4 of the model card (22 April 2026); read it in full at <https://huggingface.co/openai/privacy-filter>. Everything below is a restatement in this skill's own terms, aimed at someone deciding whether to run the skill on a particular body of text.

## It reduces exposure; it does not anonymise

OpenAI is explicit that the model is a data-minimisation aid rather than an anonymisation, compliance or safety guarantee, and warns against treating a pass through it as clearance to release text. Nothing about the output is a legal determination, and it is no substitute for policy review where the stakes are real. Treat a redaction pass as one control among several in a privacy-by-design pipeline, and treat any residual text as still potentially identifying.

## The label policy is fixed at training time

The model finds only what its taxonomy describes, and that taxonomy cannot be reconfigured at runtime — there is no flag that widens or narrows the definitions. Changing the policy means fine-tuning. The training policy leans towards personal identifiers and deliberately leaves weakly person-linked context in place, which is a defensible default but not everyone's. If your governance rules are materially stricter or materially broader than that default, the base model will not meet them without adaptation.

## Where accuracy degrades

Detection weakens on text unlike the training distribution: non-English text, non-Latin scripts, and naming conventions or subject domains outside what the model saw. Reported failure patterns fall into a few recurring shapes.

- **Missed names**: uncommon personal names, regional naming conventions, bare initials, and references buried in honorifics.
- **Missed identifiers**: domain-specific record numbers, novel credential formats, project-specific token patterns, and secrets broken across surrounding syntax.
- **Over-redaction**: public entities, place names and ordinary nouns swallowed when the surrounding context is ambiguous, and benign high-entropy strings — hashes, placeholders, sample keys, synthetic examples — mistaken for live secrets.
- **Bad span edges**: boundaries that fragment or shift in mixed-format text, long documents, and anything carrying heavy punctuation or layout artefacts.

These errors are not evenly distributed. Names and identifiers underrepresented in training, or following conventions unlike the dominant ones, are the likeliest to be dropped or badly bounded, so the residual risk lands disproportionately on particular regions, demographics and specialist domains.

## High-stakes settings need a human in the path

Medical, legal, financial, HR, education and government workflows deserve extra caution, and for a reason worth stating plainly: both error directions cost something. A missed span leaks sensitive information; an over-eager one strips context that a reviewer, auditor or decision-maker needed. Automatic redaction cannot arbitrate that trade-off, so keep a human review step.

## OpenAI's own recommendations, in short

Evaluate the model in your own domain against your own policy reference before production use; fine-tune where local policy diverges from the trained decision boundaries; keep human review on sensitive workflows; and never let the model stand in for a blanket anonymisation claim. Two misuse patterns they call out specifically: trusting default operating points without validating them on your actual data, and skipping domain adaptation when local policy demands different criteria.

## What this means for the skill

The skill wraps the same weights and inherits every limitation above.

- In high-stakes settings, **always retain a human review pass** after the skill runs.
- For non-English, non-Latin-script or regionally distinctive names, **evaluate on a sample first**. Reported per-language scores are summarised in `multilingual-coverage.md`.
- For organisational categories outside the eight built-in labels, **fine-tune** Privacy Filter on labelled data, or reach for a policy-driven classifier such as `openai/gpt-oss-safeguard-20b` with a written policy. Neither path is implemented here.
