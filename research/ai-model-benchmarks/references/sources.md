# Sources: what this skill fetches and what it only cites

Verified on the web 3 Nov 2026. "Fetched" = a script here pulls it; "cite/link" = not fetched, link it or screenshot it per `talkweaver-visuals/references/sources-and-screenshots.md`.

| Source | URL | Use it for | Status |
|---|---|---|---|
| Artificial Analysis (AA) free API | https://artificialanalysis.ai | Intelligence/Coding/Agentic indexes, price, speed, media Elo | fetched (`aa_fetch.py`) |
| AA Progress Index v1 | https://artificialanalysis.ai/methodology/progress-index; chart https://artificialanalysis.ai/trends#progress | capability across years (see `progress-and-versions.md`) | cite/link; NOT in the free API |
| Arena (human preference; formerly LMArena, rebranded Jan 2026) | https://arena.ai/leaderboard; data https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset | which model people prefer; licence | fetched (`open_sources_fetch.py`); CC BY 4.0 |
| OpenRouter | https://openrouter.ai | real usage (token share), benchmark accuracy and cost per task | fetched; CC BY 4.0 |
| Epoch AI Benchmarking Hub | https://epoch.ai/benchmarks | benchmark database, run by Epoch plus external results; CSV download; CC BY 4.0 (external data keeps its own licence) | cite/link |
| LiveBench (sponsored by Abacus.AI) | https://livebench.ai | contamination-limited, regularly refreshed benchmark; page title says "LiveBench 2.0" (release date not verified) | cite/link |
| METR task time horizons | https://metr.org/time-horizons/ | length of task agents complete; page says "no longer actively updated", last update 8 Sep 2026 | cite/link; flag as frozen |
| ARC Prize leaderboard | https://arcprize.org/leaderboard | ARC-AGI performance and cost | cite/link |
| Scale SEAL leaderboards | https://labs.scale.com/leaderboard (scale.com/leaderboard redirects) | agentic, frontier-reasoning and safety benchmarks | cite/link |
| Vals AI | https://www.vals.ai/benchmarks | industry tasks (law, finance, medicine) with price and speed | cite/link |

## AA models page vs the free feed

https://artificialanalysis.ai/models shows: Intelligence, Output speed, Latency, Price, Context window, Capability indexes, Openness Index (0-100, vs intelligence), Token use, Cost per task, End-to-end response time, Model size (open weights only). The free feed (`data/llms/models` plus media endpoints) has none of: Openness Index, context window, model size, token use, Progress Index. Checked against the 2026-11-03 snapshot's field list; the API reference lists no such fields either. For those, link the page.
