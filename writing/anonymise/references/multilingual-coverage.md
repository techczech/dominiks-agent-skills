# Multilingual Coverage

Privacy Filter is "primarily English; selected multilingual robustness evaluation reported" (per the model card metadata). This page summarises the reported multilingual numbers so you can decide whether to use the skill on a given language without first re-reading the model card.

## In-distribution languages (PII-Masking-300K test set)

From the OpenAI model card, Table 6:

| Language | Examples | Recall | Precision | F1 |
|---|---:|---:|---:|---:|
| Dutch | 7,457 | 0.937 | 0.892 | 0.914 |
| English | 7,946 | 0.965 | 0.905 | 0.934 |
| French | 8,413 | 0.969 | 0.889 | 0.927 |
| German | 8,120 | 0.965 | 0.890 | 0.926 |
| Italian | 7,976 | 0.959 | 0.886 | 0.921 |
| Spanish | 7,816 | 0.968 | 0.901 | 0.933 |

For these six languages, the skill is at production quality.

## Out-of-distribution synthetic multilingual evaluation

From the OpenAI model card, Table 7:

| Language | Examples | Recall | Precision | F1 |
|---|---:|---:|---:|---:|
| Bengali | 953 | 0.875 | 0.851 | 0.863 |
| Hausa | 941 | 0.801 | 0.720 | 0.758 |
| Hindi | 968 | 0.889 | 0.882 | 0.886 |
| Indonesian | 957 | 0.897 | 0.877 | 0.887 |
| Japanese | 968 | 0.866 | 0.897 | 0.881 |
| Korean | 962 | 0.887 | 0.903 | 0.895 |
| Mandarin Chinese | 971 | 0.921 | 0.913 | 0.917 |
| Modern Standard Arabic | 961 | 0.856 | 0.902 | 0.878 |
| Portuguese | 958 | 0.931 | 0.935 | 0.933 |
| Russian | 957 | 0.890 | 0.900 | 0.895 |
| Turkish | 956 | 0.883 | 0.852 | 0.867 |
| Urdu | 949 | 0.877 | 0.880 | 0.878 |
| Western Punjabi | 781 | 0.853 | 0.847 | 0.850 |

Languages with F1 above 0.90 (Mandarin, Portuguese, Russian, Korean) are likely usable with light validation. Languages with F1 below 0.85 (Hausa, Western Punjabi) should be evaluated in-domain before being trusted in production.

## Practical guidance

- **Czech, Polish, Hungarian, Slovak, Slovenian, Croatian, Romanian, Greek**: Not benchmarked in either Table 6 or Table 7. Treat these as untested. Run the skill on a representative sample with known ground truth before relying on it.
- **English with regional / non-Western names**: The PII-Masking-300K English split contains predominantly Western-Anglophone names. Coverage of non-Western personal names embedded in English text is implicitly partial — see Failure Modes in `limitations.md` for the related caveat about underrepresented naming conventions.
- **Mixed-language text**: The model card does not benchmark code-switched text. If the input is, for example, a Czech-language email signature in an otherwise English document, expect partial detection.

## When to fine-tune

The model card reports (Table 2) that on the SPY medical/legal dataset (which is English but out-of-distribution for the model), fine-tuning on just 10% of the SPY training split lifts F1 from 0.545 (zero-shot) to 0.962. The fine-tuning path is supported by the `opf train` CLI in the official repo.

For a language not in the tables above, the same approach would apply: collect a few thousand labelled examples in the target language and fine-tune. This skill does not currently expose a fine-tuning entry point — for fine-tuning, use the official `opf` CLI from `github.com/openai/privacy-filter`.
