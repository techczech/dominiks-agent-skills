# Existing WriteFlex operations

These names were verified in the app's capability source. Availability and parameter schemas come from the connected app, not this list. They are not CLI commands; do not invent a `writeflex` executable or import application internals to bypass policy.

| Capability | Use and result |
| --- | --- |
| `files.list`, `files.read` | Read supported workspace content. |
| `prose.edit` | Propose an exact, unique `oldText` replacement. Keep each edit to one sentence or short phrase; include `category` and a short `summary` per the current schema. |
| `prose.insert`, `prose.move` | Propose content insertion or movement using the exposed schema. |
| `objects.insert` | Propose a validated object from inner markup. |
| `frontmatter.set` | Propose metadata additions/changes; lists are arrays. |
| `frontmatter.normalise` | Normalise an existing block; it does not add or set metadata. |
| `housekeeping.create_file`, `housekeeping.rename_file` | Perform requested housekeeping through the app's write path. |
| `folio.create_manifest` | Declare a Folio only when no manifest exists. |
| `scraps.list`, `scraps.add` | Use only if the current app binds its shared scrap store. |

The application may stage a call instead of applying it. Report the returned state accurately. A refused/staged operation is not permission to reproduce it with a filesystem write. There is no external content CLI established by this skill.
