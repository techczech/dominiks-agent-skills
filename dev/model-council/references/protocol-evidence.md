# Protocol evidence and prior art

## Useful existing patterns

- [Karpathy's LLM Council](https://github.com/karpathy/llm-council) popularised three stages: independent answers, anonymous peer review, and chairman synthesis. Preserve independent first responses and inspectable outputs; do not copy its always-on OpenRouter cost model.
- [OpenAI's Codex plugin for Claude Code](https://github.com/openai/codex-plugin-cc) provides a practical cross-model pattern for code review and adversarial review. Reuse the idea of a bounded outside inspection, while keeping this skill bidirectional and task-general.
- [Simon Willison's LLM CLI](https://github.com/simonw/llm) demonstrates a provider-neutral command-line surface with stored provenance and plugins. Its plugin architecture is prior art, not a required dependency of this workflow.
- [Agent Council CLI](https://github.com/MakiDevelop/agent-council-cli) and the [AI Synthesised Perspectives catalogue](https://github.com/danielrosehill/AI-Synthesised-Perspectives) show that Claude, Codex, Gemini, local models, audit logs, and several deliberation protocols can be combined. The useful idea is route portability, not a requirement to run every model every time.

## Research cautions

- [Debate or Vote: Which Yields Better Decisions in Multi-Agent Large Language Models?](https://proceedings.neurips.cc/paper_files/paper/2025/hash/934252acd87f254d5d4672fbde283bd2-Abstract-Conference.html) separates the value of multiple initial samples from the value of later debate. Treat extra rounds as a cost that needs a concrete purpose.
- [Voting or Consensus? Decision-Making in Multi-Agent Debate](https://aclanthology.org/2025.findings-acl.606/) compares aggregation rules rather than assuming consensus is intrinsically reliable.
- [Demystifying Multi-Agent Debate: The Role of Confidence and Diversity](https://arxiv.org/abs/2601.19921) argues that viewpoint diversity and calibrated confidence matter, while vanilla debate can underperform a simple vote. Prefer genuinely different model families and preserve uncertainty.
- [When collaboration fails](https://www.nature.com/articles/s41598-026-42705-7) shows that debate can propagate an adversarial or simply wrong narrative. Never treat convergence as factual verification.

## Design consequences

1. Ask independently before revealing other model answers.
2. Prefer one useful outside view over a ceremonial panel.
3. Select different model families or evidence paths, not merely different wrappers.
4. Escalate to critique only around an identified disagreement or risk.
5. Preserve minority objections in the final account.
6. Verify factual claims against primary sources when correctness matters.
7. Record route, model, prompt packet, failures, and whether the run consumed a subscription allowance or metered API.
