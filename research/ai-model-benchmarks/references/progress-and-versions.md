# Progress over time, index versions, version-change comparisons

## Progress over time: use the Progress Index, not the Intelligence Index

AA Progress Index v1 (October 2026; https://artificialanalysis.ai/methodology/progress-index): item response theory over AA's evaluations (incl. private and legacy sets), one capability value per model, equal weight per benchmark, highest-scoring effort variant. Scaled so o3-mini (high) = 220 and GPT-5.5 (xhigh) = 320. The Intelligence Index changes its test set between versions and AA says its scores across versions are not for long-run comparison; the Progress Index is the one meant for years-apart comparison. Chart: https://artificialanalysis.ai/trends#progress.

It is NOT in the free API. For a "progress over time" ask: say so, point to the Trends page, and use a real, labelled screenshot (URL, capture time, viewport; rules in `talkweaver-visuals/references/sources-and-screenshots.md`). Do not present an Intelligence Index frontier chart as progress.

## Intelligence Index versions

- Snapshots record `intelligence_index_version` (top-level keys: fetched_at, tier, intelligence_index_version, source, data); `aa_widget.py` puts it in the footer ("Intelligence Index v4.3"). Never mix versions in one chart.
- v5 launched 27 Oct 2026: harder tests, ~60% weight on private test sets, HLE replaced by a harder subset, GDPval-AA dropped. Snapshots 2026-10-29 and later are v5; 2026-10-26 and earlier are v4.3.
- The v5 feed has no scores for 2022-2024 models. The 2026-10-26 snapshot (v4.3) still does (GPT-3.5 Turbo 5.5, GPT-4 Turbo 7, Claude 3 Opus 8.7, o1 15.2; checked).
- One-version chart from GPT-3.5 to then: `aa_widget.py frontier --snapshot-date 2026-10-26 --months 48 --out ...`; label the chart "Intelligence Index v4.3, data to 26 Oct 2026". This is a single-version frontier, not the Progress Index.

## Comparing a lab's best score across two versions (benchmaxxing check)

Use share of that version's top score, never raw scores (the scales differ). Per creator: best Intelligence Index in each snapshot, divided by the highest score in that snapshot.

Worked example, computed from the 2026-10-26 (v4.3, top 57.6, Anthropic) and 2026-11-03 (v5, top 59.4, Google) snapshots, creators with a v4.3 best above 20:

| Creator | v4.3 best (share of top) | v5 best (share of top) | Change in share |
|---|---|---|---|
| Kimi | 55.1 (96%) | 46.0 (77%) | -18 |
| Alibaba | 45.4 (79%) | 33.6 (57%) | -22 |
| DeepSeek | 45.1 (78%) | 32.5 (55%) | -24 |
| Z AI | 44.8 (78%) | 31.7 (53%) | -24 |
| MiniMax | 42.7 (74%) | 28.9 (49%) | -26 |
| Xiaomi | 46.3 (80%) | 29.9 (50%) | -30 |
| Meta | 55.8 (97%) | 49.7 (84%) | -13 |
| SpaceXAI | 46.4 (81%) | 35.0 (59%) | -22 |
| Anthropic | 57.6 (100%) | 58.4 (98%) | -2 |
| OpenAI | 52.7 (92%) | 56.9 (96%) | +4 |
| Google | 52.6 (91%) | 59.4 (100%) | +9 |

Finding: the Chinese open-weights labs (Kimi to Xiaomi) lost 18-30 points of share; Anthropic, OpenAI and Google held. Not a clean US/China split: SpaceXAI fell 22 points and Meta 13. Caveat: a fall on harder, mostly private tests is consistent with tuning to public benchmarks but does not prove it. Test difficulty, a changed task mix and effort-variant coverage also move the scores. Say "consistent with", not "shows".
