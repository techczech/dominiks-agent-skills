# Commands (generated)

Generated from the app's operation table at build. Do not edit. How to use them: [command line](cli.md).

Behaviour: direct runs at once; shown first files the change for the writer to accept in WriteFlex and changes nothing; asks needs `--confirm`.
Global options, before the operation name: `--root <folder>`, `--json`, `--source <who>`. `writeflex describe <operation>` prints one operation in full.

## Write

| Command | Arguments | Behaviour | What it does |
|---|---|---|---|
| `writeflex replace` | `<path> --target <string> [--with <string>] [--note <string>] [--source <string>] [--stdin]` | shown first | Propose replacing text in a document. Shown in WriteFlex's review dock; nothing changes until it is accepted there. |
| `writeflex insert` | `<path> [--text <string>] [--after <string>] [--note <string>] [--source <string>] [--stdin]` | shown first | Propose new text in a document, after a piece of existing text or at the end. Shown for review first. |
| `writeflex move-text` | `<path> --text <string> --after <string> [--note <string>] [--source <string>]` | shown first | Propose moving a passage to another place in the same document. Shown for review first. |
| `writeflex insert-object` | `<path> --kind <string> [--content <string>] [--after <string>] [--note <string>] [--source <string>] [--stdin]` | shown first | Propose a table, Mermaid diagram, mind map or SVG in a document. Shown for review first. |

## Shape the document

| Command | Arguments | Behaviour | What it does |
|---|---|---|---|
| `writeflex set-frontmatter` | `<path> --key <string> --value <string> [--note <string>] [--source <string>]` | shown first | Propose setting one frontmatter key of a document. Shown for review first. |
| `writeflex normalise-frontmatter` | `<path> [--note <string>] [--source <string>]` | shown first | Propose tidying a document's existing frontmatter block (lists canonicalised, nothing added). Shown for review first. |

## Review and versions

| Command | Arguments | Behaviour | What it does |
|---|---|---|---|
| `writeflex versions` | `[<path>]` | direct | List saved versions, newest first, for one document, one table, widget page or image, or the whole Collection. |
| `writeflex follow-history` | `--map <string>` | direct | Reattach versions after outside moves using a tab-separated old_path/new_path map. Writes only the version journal. |
| `writeflex undo-history` | `<id>` | direct | Undo one explicit history attachment exactly; document files stay where they are. |
| `writeflex save-version` | `<path> --name <string> [--note <string>]` | direct | Save a named version of a document, or of an inserted table, widget page or image, from the file as saved on disk. WriteFlex lists it and can restore it. A file over 25 MiB is refused: a Folio version lists it as a reference. |
| `writeflex compare-versions` | `<path> <from> [<to>]` | direct | Compare two saved versions of a document, or a version with the text now on disk. For a table, the cells that differ; for a widget page or image, whether it differs. |
| `writeflex folio-versions` | `[<folio>]` | direct | List a Folio's saved versions, newest first, with the files each holds and any a backup leaves out. |
| `writeflex save-folio-version` | `<folio> --name <string> [--note <string>]` | direct | Save a named version of a whole Folio: its Index Note, parts in running order, files not in the outline and inserted files, from the text saved on disk. |
| `writeflex compare-folio-versions` | `<folio> <from> [<to>]` | direct | Compare two Folio versions, or a Folio version with the text now on disk, part by part: unchanged, changed (words added and removed), only in one, or moved; files not in the outline and inserted files (by their file version) in the same list. |
| `writeflex import-revision` | `<folio> <file> --author <string> [--base <string>] [--match <string>] [--source <string>]` | direct | Bring a co-author's Word revision into a Folio as suggestions: saves the writer's text as a version, keeps her file, and stages her changes in the margins of the matching parts. Applies nothing. |
| `writeflex withdraw-revision` | `<revision>` | direct | Take back an incoming revision: its staged suggestions that are still waiting are removed from the margins and the revision is marked withdrawn. No part file changes. |
| `writeflex folio-version-part` | `<folio> <version> <part> [--side <string>]` | direct | Read one part of a Folio version exactly as it was saved, as numbered paragraphs ([1], [2], …): the numbers that scratchpad-send-version-text takes. |
| `writeflex restore-version` | `<path> <version> [--note <string>] [--source <string>]` | shown first | Propose restoring a saved version of a Markdown document, as one change to the whole document. Shown for review first. A table, widget page or image is refused: only the writer restores one, in WriteFlex. |
| `writeflex waiting` |  | direct | List the request files for proposed changes still in the inbox (as the files state), and answers WriteFlex could not deliver. |
| `writeflex withdraw` | `<id>` | direct | Take back a proposed change that is still waiting (by its request id), before WriteFlex reads it to add it to the review dock. |

## Find and manage files

| Command | Arguments | Behaviour | What it does |
|---|---|---|---|
| `writeflex search` | `<query> [--folder <string>] [--limit <integer>]` | direct | Search the Collection. Ranked pieces, one match per piece, with the best line. |
| `writeflex files` | `[<folder>]` | direct | List the Markdown files and folders in the Collection, or under one folder. |
| `writeflex query` | `<query> [--dir <string>]` | direct | Run a Collection query (the app's query blocks) and list the matching pieces. |
| `writeflex read` | `<path> [--section <string>]` | direct | Read a document, or one section of it (a heading and what sits under it). |
| `writeflex open` | `<path> [--line <integer>]` | direct | Open a file in WriteFlex, optionally at a line, through the writeflex://open link. |
| `writeflex create` | `<path> [--content <string>] [--source <string>] [--stdin]` | direct | Create a document. Refuses a name that is taken. The document records who created it. |
| `writeflex create-folder` | `<path>` | direct | Create a folder. A folder that is already there is left as it is. |
| `writeflex duplicate` | `<path>` | direct | Copy a document beside itself as "name (copy).md". |
| `writeflex move` | `<path> <to>` | direct | Rename or move a document. Links to it in other documents and Folio manifests are repaired. Undoable. |
| `writeflex move-folder` | `<path> <to>` | direct | Rename or move a folder. Its Index Note is renamed with it, and links to the documents in it are repaired. Undoable as one step. |
| `writeflex trash` | `<path>` | direct | Move a file or folder to the system Trash. It can be put back from the Trash; nothing is deleted for good. |
| `writeflex undo` | `[<id>] [--list]` | direct | Undo a direct change the command line made (a move or a change to an existing document), or list them with --list. See describe for what it does not cover. |

## Collect and plan

| Command | Arguments | Behaviour | What it does |
|---|---|---|---|
| `writeflex tasks` | `<path>` | direct | List the open and done checkbox items of a piece or an agent note. |
| `writeflex sources` | `<path>` | direct | List one piece's sources: those its frontmatter lists and those its text cites. |
| `writeflex scratchpad` | `[<path>] [--folio]` | direct | Read typed Scratchpad candidates with exact payloads, and optionally document inventory. Each inventory span says live or disk. |
| `writeflex scraps` | `[<origin>]` | direct | List the Collection's scraps (cuttings set aside), optionally one file's. |
| `writeflex running-order` | `[<dir>]` | direct | Read a Folio's running order: its parts in order, unwritten parts, and strays. |
| `writeflex compare-parts` | `<a> <b> [--dir <string>]` | direct | Compare two near-identical files in a folder (e.g. a sync conflict copy) and list the passages only one side has. |
| `writeflex scratchpad-send-version-text` | `<folio> <version> <part> [--side <string>] [--from <integer>] [--to <integer>] [--group <string>]` | direct | File paragraphs of a part of a Folio version in the Scratchpad as a new candidate that says which version it came from (the version, the part, who wrote it), labelled as suggested by the agent. Changes no document and no version. |
| `writeflex scrap` | `<document> [--text <string>] [--stdin]` | direct | Add a scrap to a document's scraps file. |
| `writeflex create-manifest` | `<folder>` | direct | Make a folder a Folio: write _report-structure.json listing its parts in order. |
| `writeflex set-status` | `<path> <status> [--collection <string>] [--note <string>] [--source <string>]` | shown first | Propose a piece's status (its Board lane). It rewrites the piece's frontmatter, so it is shown for review first. |
| `writeflex tick` | `<path> <line> [--untick] [--note <string>] [--source <string>]` | shown first | Propose ticking (or, with --untick, unticking) a checkbox item. Shown for review first. |
| `writeflex attach-source` | `<path> <source-path> [--collection <string>] [--note <string>] [--source <string>]` | shown first | Propose adding a research note to a piece's sources. Shown for review first. |

## Work with the agent

| Command | Arguments | Behaviour | What it does |
|---|---|---|---|
| `writeflex note` | `<document> [--body <string>] [--stdin] [--kind <string>] [--title <string>]` | direct | Add an agent note about a document, filed under agent-notes/ beside it. |
| `writeflex help` |  | direct | List the operations, grouped by task. |
| `writeflex describe` | `<operation>` | direct | Describe one operation: its group, behaviour, outcomes, arguments and an example. |

## Share and export

| Command | Arguments | Behaviour | What it does |
|---|---|---|---|
| `writeflex export` | `<path> [--version <string>] [--mark-sent-to <string>] --to <string> [--format <string>] [--confirm]` | asks | Export a document, or a folder as one file, to HTML or Word; with --version, a saved Folio version, made from its saved text and not the working files. Writes outside the Collection, so it needs --confirm. |

## Connect agents

| Command | Arguments | Behaviour | What it does |
|---|---|---|---|
| `writeflex agent status` | `[--agent <id>] [--json]` | direct | Lists the agents found on this computer, whether the skill is installed for each, its version and why a copy was kept. |
| `writeflex agent install` | `--agent <id> [--agent <id>...] [--json]` | direct | Installs the skill (and the command-line tool) for the named agents only. Keeps links, unmarked folders, edited copies and newer copies. |
| `writeflex agent remove` | `--agent <id> [--agent <id>...] [--json]` | direct | Removes the skill from the named agents, only where the app installed it and it is unedited. |

