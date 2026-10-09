# Fields and metric aliases

Language record (`/language/models/free`): `id, name, slug, release_date, model_creator{id,name}, evaluations{...}, artificial_analysis_intelligence_index_cost, pricing{...}, performance{...}`. Null = not measured.

| Alias | Source field | Better | Notes |
|---|---|---|---|
| intelligence | evaluations.artificial_analysis_intelligence_index | higher | versioned (footer) |
| coding | evaluations.artificial_analysis_coding_index | higher | often null |
| agentic | evaluations.artificial_analysis_agentic_index | higher | often null |
| finance | ...finance_and_accounting_index | higher | |
| strategy | ...strategy_and_ops_index | higher | |
| legal | ...legal_index | higher | |
| healthcare | ...healthcare_and_medical_index | higher | |
| engineering | ...engineering_index | higher | |
| economics | ...economics_index | higher | |
| input_price | pricing.price_1m_input_tokens | lower | $ per 1M tokens, log axis |
| output_price | pricing.price_1m_output_tokens | lower | |
| blended_price | computed (3 x input + output) / 4 | lower | labelled "computed" |
| index_cost | artificial_analysis_intelligence_index_cost.total_cost | lower | $ to run the Index; API returns an object (or null) |
| speed | performance.median_output_tokens_per_second | higher | |
| ttft | performance.median_time_to_first_token_seconds | lower | |
| e2e | performance.median_end_to_end_response_time_seconds | lower | |

Also in records, no alias: cache hit/write prices, time to first answer token.

Media (no release date, no slug in speech-to-text):

| Alias | Source | Better | Notes |
|---|---|---|---|
| elo | elo (+ ci_95) | higher | bar draws 95% CI whiskers; axis starts above 0 and says so |
| price | price_per_1k_images or price_per_minute | lower | not present in the categories fetched so far (text-to-image, text-to-video, text-to-speech, speech-to-text) |
| wer | aa_wer_index | lower | speech-to-text. Value 0 appears in real data (e.g. one OpenAI transcribe model) and is treated as unmeasured. Unit not documented; unverified |

speech-to-speech (`bba_score, fdb_score, tau_voice_score`) and the music, image-editing and video-audio categories are fetchable but have no widget alias yet.

Creator colours (fixed): Anthropic, OpenAI, Google, Meta, xAI/SpaceXAI, DeepSeek, Alibaba/Qwen, Mistral, Z AI, Moonshot/Kimi, Xiaomi; everything else grey. Shapes also vary per creator for colour-blind readers.
