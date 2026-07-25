# Limitations and Risks

Quoted directly from the OpenAI Privacy Filter PDF model card (April 22, 2026), section 4 "Bias, Risks, and Limitations".

## 4.1 Over-reliance Risk

> Privacy Filter is a redaction and data minimization aid, not an anonymization, compliance, or a safety guarantee. Over-reliance on the tool as a blanket anonymization claim would risk missing desired privacy objectives. Privacy Filter is best used as one of multiple layers in a holistic end-to-end privacy-by-design approach.

## 4.2 Static Label Policy

> The model will only identify PII spans that match the trained label taxonomy and definitions. Real-life privacy use cases are varied and complex, and definitions of appropriate label policies and decision boundaries can differ. Thus model defaults may not satisfy organization-specific governance requirements without calibration/fine-tuning.
>
> Privacy Filter does not support configuring label policies dynamically at runtime; instead, changing policies requires further fine-tuning of the model. The native label set and associated decision boundaries may not be appropriate for every use case. For example, the model's training policy aims to prioritize personal identifiers, often preserving context that is not strongly person-linked by design; some users may want to adjust this choice.
>
> Performance may drop on non-English text, non-Latin scripts, or naming patterns or domains that are out of distribution compared to model training.

## 4.3 Failure Modes

> Like all models, Privacy Filter can make mistakes, such as: under-detection of uncommon personal names, regional naming conventions, initials, honorific-heavy references, or domain-specific identifiers; over-redaction of public entities, locations, or common nouns when local context is ambiguous; fragmented or shifted span boundaries in mixed-format text, long documents, or text with heavy punctuation and layout artifacts; missed secrets for novel credential formats, project-specific token patterns, or secrets split across surrounding syntax; and over-redaction of benign high-entropy strings, placeholders, hashes, sample credentials, or synthetic examples that resemble secrets.
>
> These limitations can interact with demographic, regional, and domain variation. For example, names and identifiers that are underrepresented in training data, or that follow conventions different from the dominant training distribution, may be more likely to be missed or inconsistently bounded.

## 4.4 High-Risk Deployment Caution

> Additional caution is warranted in high-sensitivity settings such as medical, legal, financial, human resources, education, and government workflows. In these settings, both false negatives and false positives can be costly: missed spans may expose sensitive information, while excess redaction can remove material context needed for review, auditing, or downstream decision-making.

## 4.5 Recommendations (OpenAI's own)

> We recommend using Privacy Filter as part of a holistic privacy-by-design approach rather than as the basis for a blanket anonymization claim. Before production use, it's best to evaluate the model in-domain against local policy references. Task-specific fine-tuning should be used when local policy differs from the base decision boundaries. High-sensitivity workflows should also retain human review paths.

## 3.2 Out-of-Scope and Misuse

> Privacy Filter should not be treated as an anonymization, compliance, or safety guarantee, a substitute for policy review in high-stakes deployments, a universal privacy oracle with fixed behavior across all text genres and regions, or a legal determination system.
>
> Potential misuse includes treating unredacted output as safe for release, relying on default operating points without validating them on the target distribution, or skipping domain adaptation when local policy requires materially stricter or materially broader redaction criteria.

## Operational implication for this skill

The `anonymise` skill exposes the same model and inherits the same limitations. In particular:

- For high-stakes settings (medical, legal, financial, HR, education, government), **always retain a human review pass** after the skill runs.
- For non-English / non-Latin / regional name use, **evaluate on a sample first**. Multilingual scores from the model card are summarised in `multilingual-coverage.md`.
- For organisational categories outside the eight built-in PII labels, **fine-tune** Privacy Filter on labelled data, or use a separate policy-driven model (such as `openai/gpt-oss-safeguard-20b`) with a written policy. The latter is not implemented in this skill.
