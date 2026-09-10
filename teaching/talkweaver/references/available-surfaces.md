# TalkWeaver operation availability

The app's typed bridge includes read/save/compile, Pathway management, metadata, export and presentation operations. These are internal interfaces unless a connected tool explicitly exposes them. The skill does not ship or assume an external content CLI.

| Available surface | Appropriate action |
| --- | --- |
| Read-only file access | Inspect the outline, identity tokens, assets and existing manifests; produce a proposed revision. |
| Authorised content-file writes with editor state resolved | Apply narrow source/manifest changes; preserve unknown fields and verify fresh bytes. Report file changes without claiming app lifecycle effects. |
| A connected app capability | Use its current parameters and policy; honour refusal/proposal outcomes. |
| A verified existing compiler/preview command | Check its actual help or documented invocation, installed version and output paths; compile to a fresh destination and inspect its output. |
| UI control already available | Use observed app commands when authorised; do not assume a keyboard shortcut executed successfully. |

Existing source entrypoints such as `prepareSource` and save IPC handlers document behaviour; their presence does not grant an external agent a callable tool. Development commands build or launch the application, not an individual presentation. Do not substitute the retired standalone presentation pipeline for the bundled compiler without verifying format compatibility and user intent.

If no compiler is exposed, finish the content draft or change proposal and identify app preview as unverified. That limitation does not prevent useful authoring work.
