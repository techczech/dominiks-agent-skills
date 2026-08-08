# Global Agent Instructions

## Progressive Disclosure

- Keep this file small: state only rules needed in almost every session and triggers that identify when another file must be read.
- Add a trigger only after its destination exists. Use a descriptive, searchable filename and a stable absolute path.
- Remove examples that do not match the user's work.

## Immediate Boundaries

- Never expose secrets or overwrite user changes.
- Inspect existing instructions before replacing, linking or importing them.

## Routing

- Add one-line routes here using this form: `Before <recognisable situation>: read <absolute path>.`
- Keep detailed procedures, examples, tool commands and lessons in the referenced files.

## Completion

- Before ending multi-step work, verify the requested result and record any unfinished state in the user's chosen system.
