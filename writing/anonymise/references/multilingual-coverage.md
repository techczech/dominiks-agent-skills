# Multilingual Coverage

Privacy Filter is an English-first model with a limited multilingual evaluation attached. This page condenses the reported results into a usability judgement per language, so you can decide whether to run the skill on a given text without going back to the source. Full evaluation tables (Tables 6 and 7, with recall and precision alongside the F1 figures quoted here) are in the model card: <https://huggingface.co/openai/privacy-filter>.

## Trained languages — use without special precautions

Six Western European languages appear in the PII-Masking-300K training distribution and score close together on its test split, all between F1 0.91 and 0.93:

**English (0.934) · Spanish (0.933) · French (0.927) · German (0.926) · Italian (0.921) · Dutch (0.914)**

Each was evaluated on roughly 7,500–8,400 examples, so these numbers are stable. For text in these six, the skill is at production quality.

## Untrained languages — held-out synthetic evaluation

Thirteen further languages were tested on synthetic data the model had not been trained on, roughly 1,000 examples each. Grouping them by reported F1 gives a rough operating guide:

| Usability | Languages (F1) |
|---|---|
| Comparable to trained languages | Portuguese (0.933), Mandarin Chinese (0.917) |
| Usable after a spot-check on your own data | Korean (0.895), Russian (0.895), Indonesian (0.887), Hindi (0.886), Japanese (0.881) |
| Marginal — validate in-domain before trusting | Modern Standard Arabic (0.878), Urdu (0.878), Turkish (0.867), Bengali (0.863) |
| Do not deploy without an evaluation | Western Punjabi (0.850), Hausa (0.758) |

The band boundaries are this skill's judgement, not the model card's. Note the character of the evaluation: synthetic text is cleaner and more regular than real correspondence, so treat these as optimistic ceilings rather than expected field performance.

## Practical guidance

- **Central and Eastern European languages** — Czech, Polish, Slovak, Hungarian, Slovenian, Croatian, Romanian, Greek — appear in neither evaluation. They are untested, not implicitly covered by the neighbouring scores. Run the skill over a representative sample with known ground truth before relying on it.
- **English carrying non-Western names** is a quiet gap. The English evaluation split is dominated by Western Anglophone names, so a non-Western personal name inside otherwise English text sits outside what the reported 0.934 measures. The failure-mode notes in `limitations.md` cover the same weakness from the model card's side.
- **Code-switched and mixed-language text** was not benchmarked at all. Expect partial detection where, say, a Czech email signature closes an English document.

## When to fine-tune

Fine-tuning recovers a great deal for a modest amount of labelled data. On the SPY medical/legal benchmark — English, but far outside the training distribution — the model card reports zero-shot F1 of 0.545 rising to 0.962 after training on a tenth of the SPY training split. A few thousand labelled examples in an unbenchmarked language should behave similarly. Use `opf train` from `github.com/openai/privacy-filter`; this skill exposes no fine-tuning entry point.
