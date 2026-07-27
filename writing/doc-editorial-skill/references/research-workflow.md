# Research Workflow

Two-step fact verification. First identify what could be checked, then verify only what the user selects.

## Core Interaction Pattern

**Step 1 — Identify candidates:**
1. **Scan** — Read doc(s) and extract verifiable claims
2. **Group** — Organize by staleness risk
3. **Present** — Show the candidate list
4. **Ask** — User selects which to verify

**Step 2 — Verify selected:**
1. **Research** — Web search against official sources
2. **Classify** — Confirmed / Outdated / Broken URL / Unable to verify
3. **Present** — Show findings with sources
4. **Ask** — User selects which to update

## Inputs

- **Target**: Single doc path or "all"
- **Scope**: Optionally narrow to specific claim types

## Step 1: Identifying Candidates

Scan doc(s) for factual assertions that could go stale. Extract:

- **Version numbers**: Software versions, API versions, Node.js LTS, etc.
- **CLI commands**: Install commands, configuration commands, tool invocations
- **URLs**: Documentation links, download pages, repository URLs
- **Tool features**: Descriptions of what a tool can/cannot do
- **Platform-specific steps**: OS-specific instructions (macOS, Windows, Linux)
- **Pricing/availability**: Free tier limits, plan names, feature availability
- **Installation steps**: Package manager commands, setup procedures

### Grouping by Staleness Risk

Present candidates grouped from most to least likely to be outdated:

1. **Version numbers** — Change frequently, high risk
2. **CLI commands** — Flags and syntax change between versions
3. **URLs** — Pages move, restructure, or disappear
4. **Tool features** — Features change but less frequently
5. **Platform steps** — OS updates can change paths and procedures
6. **General claims** — Conceptual descriptions, least likely to be wrong

For each candidate, show:
- The claim (quoted from the doc)
- Location (doc name, approximate position)
- Why it's a candidate (what could change)

Ask the user which candidates to verify. They may select individual items, entire risk groups, or say "check everything in doc X."

## Step 2: Verifying Selected Claims

For each selected claim:
1. Search for the official source (documentation site, GitHub repo, release notes)
2. Compare the claim against current official information
3. Classify the finding

### Classification

- **Confirmed**: Claim matches current official docs (include source URL)
- **Outdated**: Claim contradicts current info (include what changed and source)
- **Broken URL**: Link returns 404, redirects elsewhere, or no longer exists
- **Unable to verify**: No authoritative source found (note what was searched)

### Presenting Findings

Show findings with proposed corrections:
- For outdated claims: show the old text, the correct current info, and the source
- For broken URLs: suggest a replacement URL if found
- For unverifiable claims: flag for the user to decide (keep, remove, or investigate manually)

Ask user which updates to apply.

## Output

- Write report to `editorial-workspace/research/research-YYYY-MM-DD.md`
- Append entry to `editorial-workspace/changelog.jsonl`
- For approved updates: edit the doc, update frontmatter `updated` date, log each fix
