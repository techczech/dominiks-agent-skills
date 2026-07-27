# Troubleshooting

## Server not responding on :1234

```bash
lms server start
lms load google/gemma-4-12b
```

The LM Studio app must be installed, and the first use of `lms` may need `lms bootstrap` to put the CLI on `PATH`.

## Model won't load / not in catalog

App or runtime predates `gemma4_unified` (June 2026). Update app, then Settings → Runtimes → update engines.

## Empty content in response

Reasoning mode consumed the whole token budget (`completion_tokens_details.reasoning_tokens` ≈ `completion_tokens`).
Raise `--max-tokens`; 3-4× desired visible output. Script default 1500.

## Garbage / repeated tokens

Quant corruption — confirm with a text-only request first:

```bash
curl -s http://localhost:1234/v1/chat/completions -H "Content-Type: application/json" \
  -d '{"model":"google/gemma-4-12b","messages":[{"role":"user","content":"Who are you?"}],"max_tokens":400}'
```

Garbage on text too → re-download the GGUF in LM Studio or try another quant.

## Audio input rejected (HTTP 400)

Expected — the GGUF mmproj is vision-only. Transcribe the audio with a separate speech-to-text tool and combine per Recipe 4.

## Slow generation / memory pressure

- 15 frames ≈ 1k visual tokens; 60 frames ≈ 4.2k — long videos at full frame count are the slow case. Reduce `--max-frames` for gist questions.
- Close other model servers on 16-32GB machines.

## Wrong timestamps in scene breakdowns

Only valid when frames really are 1 FPS from t=0: keep `--fps 1`, no `--max-frames` truncation on >60s video — segment instead (`references/commands.md`).
