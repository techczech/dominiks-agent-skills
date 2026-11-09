# run.json format

One file per run. The block below is annotated: `//` comments are explanations, not valid JSON. Append as the run proceeds. Paths in evidence are relative to the run.json folder. Unknown fields are ignored by the renderer; missing optional sections are skipped.

```json
{
  "title": "Settings page polish",
  "mode": "climb",                      // climb | score
  "goal": "Make the app look better than Claude Code and Codex",
  "caller": "design-review",              // skill or session that started it
  "owner": "Owner name",
  "started": "2026-11-06", "ended": "2026-11-07",
  "status": "target-met",               // running | target-met | round-cap | budget-cap | plateau | stopped
  "provenance": "where the data came from",
  "target": {"threshold": 9.0, "rule": "every judge ≥ 9 overall", "hidden_from_judges": true},
  "budget": {"rounds": 12, "cost": "about $250", "time": "18 h agent time"},
  "human_signal": [
    {"kind": "preference", "text": "Too grayscale; restore some colour", "source": "owner prompt, round 7"}
  ],                                    // kinds: preference | example | comparator | veto | correction | house-rule
  "rubric": {
    "version": 1, "scale": "1-10", "overall": "judge holistic",
    "criteria": [
      {"id": "hierarchy", "name": "Hierarchy", "description": "...", "source": "derived",
       "weight": 1, "anchors": {"3": "...", "6": "...", "9": "..."}}
    ],
    "checks": [{"id": "small-window", "name": "Fits 1000 px window", "kind": "programmatic"},
               {"id": "preserved", "name": "Owner-approved text and figures present", "kind": "preservation"}],
    "locked": [{"text": "Benchmark paragraph cut by owner; do not ask for it back", "source": "owner, 5 Nov"}],
    "changes": [{"round": 4, "version": 2, "what": "added colour criterion", "why": "owner signal"}]
  },
  "metrics": [{"id": "violations", "name": "Geometry violations", "direction": "lower", "unit": "count"}],
  "agents": [
    {"id": "a1", "name": "Judge A1", "role": "judge", "requested_model": "<provider-model-id>",
     "returned_model": "<model id from run metadata>", "route": "subagent", "effort": "high",
     "link": "link to the child session, if any", "notes": ""},
    {"id": "a2", "name": "Judge A2", "role": "judge", "requested_model": "<provider-model-id>", "returned_model": "<model id>",
     "same_family": true},              // same model family as the implementer: shown, never meets the stop rule alone
    {"id": "sealed", "name": "Sealed judge", "role": "judge", "sealed": true, "requested_model": "<another-model-id>"}
  ],                                    // roles: orchestrator | builder | judge. One entry per judge seat;
                                        // seats sharing a model are grouped by returned (else requested) model;
                                        // "sealed": true = hold-out seat the implementer never sees (round 0 and stop only)
  "subjects": [
    {"id": "candidate", "name": "T3 Code (branch)", "kind": "candidate"},
    {"id": "claude-code", "name": "Claude Code", "kind": "comparator"}
  ],                                    // kinds: candidate | baseline | comparator | option | entrant
                                        // tournament: one "entrant" subject per implementer, with "implementer": agent id
  "rounds": [
    {
      "n": 1, "date": "2026-11-06", "summary": "...",
      "scores": [
        {"judge": "a1", "subject": "candidate", "criterion": "overall", "score": 7.4},
        {"judge": "a1", "subject": "candidate", "criterion": "hierarchy", "score": 7.0}
      ],                                // a judge not run this round: omit, or "score": null with "note"
      "metrics": {"violations": 86},
      "checks": {"small-window": false},
      "judge_notes": [{"judge": "a1", "text": "Sidebar competes with content"}],
      "decisions": [
        {"by": "builder", "decision": "Mute sidebar text", "reason": "Sol: sidebar competes",
         "criteria": ["hierarchy"],
         "evidence": [
           {"type": "text", "label": "Label copy", "before": "Thread title", "after": "Title"},
           {"type": "images", "before": "evidence/r1-before.png", "after": "evidence/r1-after.png", "caption": "Sidebar"},
           {"type": "image", "path": "evidence/r1-diagram.png", "caption": "Annotated change"},
           {"type": "note", "text": "diff: 4 files, +38 −21"}
         ]}
      ],
      "response": {                     // what the implementer did in response to this round's scores
        "by": "builder",
        "summary": "Worked on hierarchy and contrast, the two lowest criteria",
        "acted_on": [{"from": "a1", "finding": "Sidebar competes with content", "action": "Muted sidebar text one step", "criteria": ["hierarchy"]}],
        "declined": [{"from": "b2", "finding": "Add a dashboard view", "why": "New feature, outside the rubric; added to outcome.later"}],
        "escalated": [{"from": "a2", "finding": "Rename Talk to Presentation", "why": "Owner-level naming choice"}],
        "reverted": [{"change": "Bolder sidebar headings", "why": "Pairwise preferred previous; gain within noise"}]
      },
      "outliers": ["a2"],               // seats flagged this round (>1.5 from median overall two rounds running)
      "winner": "entrant-b",            // tournament rounds: the entry carried forward
      "pairwise": [{"judge": "b1", "winner": "current", "reason": "Save is findable"}],  // current | previous | tie
      "usage": [                        // one entry per agent call in this round; null = unknown
        {"agent": "a1", "started": "2026-11-06T10:02:00Z", "ended": "2026-11-06T10:06:30Z",
         "tokens_in": 41000, "tokens_out": 2200, "cost": 0.0, "cost_basis": "subscription"},
        {"agent": "builder", "started": "...", "ended": "...", "tokens_in": null, "tokens_out": null,
         "cost": null, "cost_basis": "unknown"}
      ]                                 // cost_basis: metered | list-price-estimate | subscription | unknown; cost in USD
    }
  ],
  "outcome": {"verdict": "Every judge ≥ 9", "owner_verdict": "pending", "notes": "", "later": ["ideas held back"]}
}
```

Scores: one entry per seat × subject × criterion, plus `overall`. Every criterion, every subject, every round.

Duration per call comes from started/ended (or `duration_s`). Totals in the report count only known values and say how many calls were unknown.

Score mode: one round; subjects are options; `decisions` may hold the proposer's recommendation (`by: "proposer"`).
