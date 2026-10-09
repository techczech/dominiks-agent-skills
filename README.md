# Agent skills developed or adapted by Dominik Lukeš for public sharing

Website: <https://techczech.github.io/dominiks-agent-skills/>

Curated, sanitised copies of the skills [Dominik Lukeš](https://github.com/techczech)
uses with coding agents — Claude Code, Codex, and other tools that read the
Agent Skills format. Each one is maintained in a private monorepo and published
here through a sanitising pipeline, so this repository holds the public version
of a skill rather than its working copy: paths and personal references are made
generic, and anything tied to a private setup is removed before publication.

**Note:** some of these skills may depend on particular agent and machine
configurations that are not shared here.

## Layout

One folder per category, one folder per skill inside it:

```
<category>/<skill-name>/
```

Every skill is self-contained. `SKILL.md` carries the instructions the agent
reads; anything else the skill needs — scripts, templates, reference notes —
sits beside it in the same folder.

<!-- skill-index:start -->
## Skills

### [dev](dev/)

Building and checking software, designs and documents.

- [cognitive-walkthrough](dev/cognitive-walkthrough/): Runs a cognitive walkthrough on a mockup, screenshot or live page to check how easily a new user can learn it, and writes a learnability report.
- [dev-traffic-control](dev/dev-traffic-control/): Lets agents file test requests and reviews in Dev Traffic Control, a desktop review app, and collect the answers.
- [image-to-design](dev/image-to-design/): Takes a design from a written brief through generated mockups to HTML/CSS, keeping every prompt, image and revision on disk.
- [project-changelog](dev/project-changelog/): Keeps a structured changelog folder in a repository alongside its git history.
- [single-html-document](dev/single-html-document/): Builds self-contained single-file HTML documents (reports, explainers, slide decks, feedback forms) that work offline.
- [skill-explorer](https://github.com/techczech/skill-explorer): Turns a SKILL.md file into an interactive web page showing its structure, code and connections. (separate repository)

### [estate](estate/)

Running a setup with several agents, tools and repositories.

- [agents-md-streamline](estate/agents-md-streamline/): Writes and tightens AGENTS.md and CLAUDE.md files so they tell an agent what to do, not the project's history.
- [ai-working-style-builder](estate/ai-working-style-builder/): Helps you describe how you work so AI tools fit your communication, attention and record-keeping habits.
- [global-agent-instructions](estate/global-agent-instructions/): Keeps one global instruction file and installs it into Codex, Claude Code, Gemini CLI, OpenCode and pi.
- [todoscout](estate/todoscout/): Lets agents read and summarise the action items held in the TodoScout app.

### [media](media/)

Images, audio and video: generation, transcription, speech and analysis.

- [codex-images-workflow](media/codex-images-workflow/): Treats generated images as reproducible files: a written brief first, the image beside it, both versioned.
- [speech-to-text-skill](https://github.com/techczech/speech-to-text-skill): Transcribes audio locally on Apple Silicon into time-coded transcripts, with optional speaker labels. (separate repository)
- [text-to-image-skill](https://github.com/techczech/text-to-image-skill): Generates and edits images locally on Apple Silicon with open models such as FLUX.2 Klein and Qwen-Image. (separate repository)
- [text-to-speech-skill](https://github.com/techczech/text-to-speech-skill): Generates speech locally on Apple Silicon with several open voice models, including voice cloning and Czech. (separate repository)
- [video-analysis](media/video-analysis/): Describes, summarises or answers questions about a video on your own machine with a local model.

### [research](research/)

Research workflows: papers, sources, translation, corpus linguistics and model benchmarks.

- [academic-pdf-to-mkd](research/academic-pdf-to-mkd/): Converts academic PDFs, including scans, into Markdown with figures, tables and page images as separate files.
- [ai-model-benchmarks](research/ai-model-benchmarks/): Builds offline comparison charts and tables of AI models from Artificial Analysis, Arena and OpenRouter data.
- [cesky-narodni-korpus-skill](https://github.com/techczech/cesky-narodni-korpus-skill): Queries the Czech National Corpus (KonText) for concordances, frequencies and collocations from inside an agent. (separate repository)
- [claim-fact-checker](research/claim-fact-checker/): Checks every factual claim in a report against its sources, one isolated checker per claim, and writes findings and a fix plan.
- [corpus-tools-skill](https://github.com/techczech/corpus-tools-skill): Sets up a local corpus-linguistics toolchain on a Mac (NLTK, spaCy, Stanza, Corpus Workbench, OPUS) with a parallel-concordance tool. Draft. (separate repository)
- [paper-reviewer-skill](research/paper-reviewer-skill/): Imports a paper from Zotero, extracts its text, figures and tables, and writes structured reviews.
- [research-translation](research/research-translation/): Runs auditable translation and back-translation of participant-facing research documents such as consent forms.
- [sketchengine-skill](https://github.com/techczech/sketchengine-skill): Connects an agent to Sketch Engine to run word sketches, word lists and keyword analyses on its corpora. (separate repository)

### [teaching](teaching/)

Presentations and teaching content.

- [PPT2HandoutSkill](https://github.com/techczech/PPT2HandoutSkill): Converts a PowerPoint presentation into an interactive handout website. (separate repository)
- [talkweaver](teaching/talkweaver/): Lets agents write and revise presentation content for the TalkWeaver app, including converting PowerPoint files and processing recordings.

### [writing](writing/)

Editing, anonymising and organising writing.

- [anonymise](writing/anonymise/): Finds and redacts personal information in text on your own machine with an open-weight model, with no cloud service.
- [doc-editorial-skill](writing/doc-editorial-skill/): Edits documents for clarity and structure.
- [readability-skill](https://github.com/techczech/readability-skill): Helps write more readable text and design more readable slides. (separate repository)
- [writeflex](writing/writeflex/): Lets agents read, organise and prepare Markdown content for the WriteFlex app.

<!-- skill-index:end -->

## Using a skill

Copy or symlink the skill's folder into your agent's skills directory, for
example `~/.claude/skills/<skill-name>`, or install it with `npx skills add`.
A skill folder is the whole unit; skills that need extra setup say so in their
own `SKILL.md`.

```bash
# Claude Code, globally
ln -s /path/to/dominiks-agent-skills/<category>/<skill-name> ~/.claude/skills/<skill-name>

# or for one project
mkdir -p .claude/skills
ln -s /path/to/dominiks-agent-skills/<category>/<skill-name> .claude/skills/<skill-name>
```

## What is here

Skills arrive as they are cleaned for public use, so the collection grows a
skill at a time and never mirrors everything in the private repository. Each
published skill carries a `PUBLISHED-FROM.md` recording the source it came from
and the date it was published. Edits made to a published copy are overwritten by
the next publish, so please open an issue if something is broken or unclear
rather than patching the generated files.

## Licence

MIT — see [LICENSE](LICENSE).
