# Dominik's Agent Skills

Curated, sanitised copies of the skills [Dominik Lukeš](https://github.com/techczech)
uses with coding agents — Claude Code, Codex, and other tools that read the
Agent Skills format. Each one is maintained in a private monorepo and published
here through a sanitising pipeline, so this repository holds the public version
of a skill rather than its working copy: paths and personal references are made
generic, and anything tied to a private setup is removed before publication.

## Layout

One folder per category, one folder per skill inside it:

```
<category>/<skill-name>/
```

Every skill is self-contained. `SKILL.md` carries the instructions the agent
reads; anything else the skill needs — scripts, templates, reference notes —
sits beside it in the same folder.

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
