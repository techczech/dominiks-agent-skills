# Cognitive Accessibility Framework

**Status:** Core reference; working draft. Preserve and refine through later examples and user feedback.

## Contents

1. [Purpose](#purpose)
2. [Universal design baseline](#universal-design-baseline)
3. [Five dimensions](#five-dimensions)
4. [Delivery layers](#delivery-layers)
5. [Relationship to readability](#relationship-to-readability)
6. [User-facing delivery check](#user-facing-delivery-check)
7. [Worked example](#worked-example)
8. [Load analysis](#load-analysis)
9. [Application in AI Working Style Builder](#application-in-ai-working-style-builder)
10. [Sources](#sources)

## Purpose

Extend readable and accessible document design beyond surface formatting. Evaluate how information design affects:

- maintaining focus;
- discerning what matters;
- understanding the content;
- moving through and returning to it;
- preserving continuity across interactions.

Treat the dimensions as overlapping lenses, not independent stages or diagnoses.

Accessibility applies to the whole information arrangement: content, conversation, interface, and records. Clear prose helps, but it cannot by itself provide alternative reading paths, persistent position, or continuity across conversations.

## Universal Design Baseline

Assume that every user may:

- want the answer immediately;
- want to inspect the complete explanation before acting;
- prefer guidance one stage at a time;
- leave and return unexpectedly;
- change the desired level of detail;
- need the result outside the original conversation.

Do not wait for the user to identify overload, distraction, disability, or a preferred learning style. Do not make accessible structure conditional on a diagnosis or self-description.

For substantive explanations and multi-stage instructions:

1. answer the immediate question first;
2. expose a quick route, guided route, and uninterrupted complete route without requiring repeated permission;
3. make optional technical depth easy to reach without placing it in the main route;
4. offer a resumable record when the work may continue beyond the conversation;
5. let the user move between routes without explaining why.

These are ordinary access paths, not special accommodations.

## Five Dimensions

### Attention

**Question:** How easily can the user remain focused on what matters without being drawn into irrelevant detail?

Common stressors:

- unsolicited alternatives;
- competing signals;
- excessive background before the task;
- long undifferentiated responses;
- unrelated next steps.

Helpful responses:

- put the immediate purpose first;
- bound the current scope;
- keep one active decision visible;
- separate optional detail;
- use small examples rather than catalogues.

### Perception

**Question:** How difficult is it to discern what needs attention?

Common stressors:

- weak hierarchy;
- dense layout;
- inconsistent formatting;
- colour-only distinctions;
- visually competing decoration.

Helpful responses:

- use space and contrast;
- mark semantic headings correctly;
- keep paragraphs and lines bounded;
- use meaningful emphasis;
- communicate distinctions through more than colour alone.

### Cognition

**Question:** How easily can the user understand the content without holding too many unresolved elements in working memory?

Common stressors:

- complex sentences;
- implicit actions or decisions;
- too many simultaneous steps;
- unexplained terminology;
- distant explanations and consequences.

Helpful responses:

- express propositions and actions explicitly;
- use direct clauses and useful verbs;
- keep one principal action per step;
- place reasons near the relevant action;
- demonstrate unfamiliar ideas with concrete examples.

### Navigation

**Question:** How easily can the user locate a relevant part, understand their position, and return after interruption?

Common stressors:

- missing overview;
- vague headings;
- long linear-only presentation;
- unclear progress or completion;
- unsearchable text and links.

Helpful responses:

- show an outline when the content warrants one;
- use descriptive headings and numbered steps;
- mark current position, expected result, and completion;
- provide meaningful links and searchable text;
- include resumption points.

### Organisation

**Question:** How easily can the user maintain continuity and memory across documents, conversations, and sessions?

Common stressors:

- decisions trapped in chat;
- changing instructions with no history;
- unfinished threads with no return point;
- repeated reconstruction of context;
- no current-state summary.

Helpful responses:

- maintain a durable journal or resumable record;
- record decisions with reasons;
- distinguish current guidance from chronological history;
- preserve things to return to and the next action;
- link central instructions to supporting detail.

## Delivery Layers

Use four connected layers when the work extends beyond a short answer:

### Content

State the outcome, actions, reasons, conditions, and expected results. Keep the content independent of one conversational sequence or visual presentation.

### Conversation

Use chat for interpretation, clarification, and adaptive help. Give a useful answer before offering delivery choices. Do not require the user to proceed through repeated questions when the complete route can be made available.

### Reading Interface

Use semantic HTML when the material benefits from parallel reading paths, visible position, non-linear navigation, progressive reveal, search, annotation, or offline reuse. Treat HTML as a delivery surface, not the only copy of the information.

A reading interface may contain quick, guided, complete, and technical-depth routes because these serve different reading strategies. Keep feedback collection and sharing as separate versions unless the user requests a combined artefact.

### Durable Record

Keep current state, decisions, next actions, and history outside chat when they must survive the interaction. Prefer an editable journal or Markdown record as the canonical source. Generate reading HTML from that source; return progress or annotations to the record rather than allowing independent copies to drift.

The layers have different jobs:

- chat supports the working conversation;
- the record preserves continuity;
- HTML supports reading and navigation;
- separate feedback or sharing versions support later purposes.

## Relationship to Readability

| Readability principle | Primary load reduced | Supporting effects |
| --- | --- | --- |
| **Space** | Perception and attention | Makes content more approachable and reduces visual competition |
| **Chunks** | Cognition and attention | Supports scanning, resumption, and bounded action |
| **Guides** | Perception and navigation | Shows structure, importance, and possible reading paths |
| **Information structure** | Attention and cognition | Puts the useful proposition before background |
| **Simple language** | Cognition | Reduces grammatical and lexical processing demands |
| **Semantic accessibility** | Perception and navigation | Supports screen readers, heading navigation, meaningful links, and non-colour cues |
| **Durable records** | Organisation | Extends accessibility beyond one document or interaction |
| **Parallel depth** | Attention, cognition, and navigation | Lets users choose a quick, guided, complete, or technical route without repeated interruption |

One design choice may affect several dimensions. A descriptive heading improves perception, supports navigation, and reduces cognitive effort by revealing the proposition before the section is read.

## User-Facing Delivery Check

Apply the framework silently before exposing it. A user-facing guide should pass these checks:

- **The first screen names a recognisable problem or useful result.** It does not begin with the design theory, a slogan, or a map of internal system components.
- **Headings answer the reader's questions.** They describe what the reader can do, what an option changes, or what a result contains.
- **Examples show results.** Present the finished instructions, profile, journal, or reading routes before discussing why the structure works.
- **Language addresses the reader.** Replace implementation terms such as “operational source package”, “delivery layer”, or “durable record” with the action or benefit relevant to the reader.
- **Visual hierarchy supports scanning.** Keep display headings short, constrain their scale, bold load-bearing words, and avoid layouts where decorative type or secondary panels compete with the task.
- **Technical material remains secondary.** When an HTML file must carry complete agent instructions, place them in a clearly labelled appendix that does not interrupt the main reading path.

Do not copy the design conversation into the artefact. The framework is successful when readers benefit from it without needing to learn its vocabulary.

## Worked Example

The example uses a generic cloud-storage application. It demonstrates information design rather than documenting one product's current interface.

### Ordinary Request

The user asks:

> How do I make my Projects folder available offline?

Do not require the user to add that long instructions are difficult, that they may be interrupted, or that they want an accessible format. Treat variable attention, reading depth, and interruption as normal conditions.

### Inadequate Chat-Only Answer

> To make the Projects folder available offline, open the cloud storage application and go to settings, although on some versions you may need to open the folder in Finder first, and select the Projects folder. Make sure you have enough disk space because this will download everything. Choose Always keep on this device or Make available offline. It may take some time. You should not close the application, and if there are errors check your internet connection. Once it has finished there should be a green icon, but icons differ between versions. You can then disconnect from the internet and open a file to test it.

Problems:

- the immediate action is buried;
- preparation, action, warning, and verification are mixed;
- interface variants compete for attention;
- the user cannot choose a different depth without restarting the exchange;
- no uninterrupted complete explanation is available;
- no stopping or resumption point is visible;
- nothing preserves the state outside chat.

### Accessible Default Response

Answer the task before presenting options:

> Select the **Projects** folder, open its context menu, and choose **Always keep on this device** or the equivalent offline option.
>
> Keep the cloud-storage application running until the download finishes. Then disconnect from Wi-Fi briefly and open a file to verify that it works.
>
> I can also put this into a browser guide with quick, guided, complete, and technical views, and save a resumable record of where you reached.

This response does not diagnose the user or turn the task into an interview. It provides immediate value and exposes the available routes once.

### Reading Routes

When the user wants a browser guide, give them parallel routes through the same content:

```text
PROJECTS FOLDER AVAILABLE OFFLINE

Quick route     Guided steps     Full guide     Technical detail
```

The routes support different reading strategies. They do not represent fixed types of user.

#### Quick Route

1. Select **Projects**.
2. Choose **Always keep on this device** or the equivalent offline option.
3. Wait for the download to finish.
4. Disconnect briefly and open a file.

Show the current position here when the task has already started.

#### Guided Steps

Present one stage prominently while keeping the overall sequence visible:

```text
Step 2 of 4: Make the folder available offline

Open the context menu for Projects.

Choose “Always keep on this device” or the equivalent option.

Expected result: The folder begins downloading.

Previous step                              Next step
```

Do not require confirmation after every step. Let the user move directly between stages.

#### Full Guide

Present the whole procedure as a continuous, searchable document. Do not interrupt it with conversational questions.

##### Outcome

Files in the Projects folder will open without an internet connection.

##### Before Starting

Check that:

- the cloud-storage application is running;
- the Projects folder has finished synchronising;
- the computer has enough free space for the folder.

The download can continue while other work is taking place.

##### 1. Find the Projects Folder

Open the cloud-storage folder in Finder or File Explorer.

Select **Projects** without opening it.

**Expected result:** The Projects folder is selected.

##### 2. Make the Folder Available Offline

Open the folder's context menu.

Choose **Always keep on this device**, **Make available offline**, or the equivalent option used by the application.

Avoid changing unrelated synchronisation settings.

**Expected result:** The application begins downloading the folder.

##### 3. Wait for the Download

Keep the cloud-storage application running.

**Expected result:** The application marks the folder as downloaded or available offline.

##### 4. Verify the Result

Temporarily disconnect from Wi-Fi.

Open one file from the Projects folder.

- If the file opens, the configuration works.
- If it does not open, reconnect and check whether downloading has finished.

Reconnect to Wi-Fi after the test.

##### Resume Later

- Continue from Step 3 if downloading is still in progress.
- Continue from Step 4 if the folder appears fully downloaded.
- Return to Step 2 if no offline setting is active.

#### Technical Detail

Keep optional explanations reachable without placing them in the main route. They may cover:

- the difference between synchronised and offline files;
- the meaning of status indicators;
- local-storage use;
- what happens when a file changes on another device;
- product-specific labels and recovery paths.

The user can move into this material without requesting permission from the assistant and return to the task without losing position.

### Durable Setup Outside Chat

When the task may continue beyond the conversation, offer a resumable record as a normal capability rather than as a response to an inferred deficit:

> I can save the instructions and current position so this can be resumed from another conversation.

Use one canonical journal entry where possible:

```markdown
# Projects Folder Available Offline

Status: In progress
Current point: The folder is downloading
Next action: Check whether the download has finished
Verification: Not yet completed

## Intended Result

Files in Projects should open without an internet connection.

## Guide

[The complete instructions appear here.]

## Journal

### 12 August 2026

- Selected Projects.
- Used “Always keep on this device”.
- Download started.
- Resume from Step 3.
```

Generate the reading HTML from this record. If the user returns in another conversation, read the record and resume from the explicit next action rather than reconstructing the state from chat history.

### Separate Later Purposes

The reading HTML may include quick, guided, complete, and technical routes because all four support reading. Do not add feedback collection or sharing controls by default.

After the user has reviewed or used the guide:

- offer a separate feedback version for progress, annotations, corrections, or exported notes;
- offer a separate privacy-checked sharing version without personal history or private paths.

A portable feedback page should export its observations. The agent applies approved feedback to the canonical journal and regenerates the reading version. Do not allow the journal, reading copy, feedback copy, and sharing copy to become independent sources of truth.

## Load Analysis

### Attention

The immediate answer appears before delivery choices. The quick and guided routes keep the active task prominent. Technical detail remains available without competing with the main route.

### Perception

The HTML gives preparation, action, expected results, current position, and recovery information distinct roles. Semantic headings and text labels reveal hierarchy without relying on colour.

### Cognition

Each step contains one principal action, while the full guide preserves the complete model. The user can select depth without holding earlier chat messages or unanswered questions in working memory.

### Navigation

Quick, guided, complete, and technical routes support different reading strategies. Numbered steps, current-position cues, searchable headings, and resumption points support movement within and between sessions.

### Organisation

The journal preserves instructions, current state, observations, and the next action outside chat. HTML remains a generated reading surface rather than a competing record. Another interaction can resume without reconstructing the work from chat history.

## Application in AI Working Style Builder

Use this framework to:

1. apply accessible structure before the user identifies a difficulty;
2. identify additional load from the user's account without diagnosing them;
3. answer the immediate task before offering alternative delivery routes;
4. provide quick, guided, uninterrupted complete, and optional technical-depth routes for substantive material;
5. demonstrate a relevant principle with one bounded example;
6. test the same principle on the user's real content;
7. record aesthetic response and practical usefulness separately;
8. treat successful patterns as provisional until tested in real work;
9. offer a durable record when the work may outlast the conversation;
10. keep reading, feedback, and sharing artefacts separate by default.

Do not present the full framework during a normal first interaction. Apply it silently, answer the task, and expose routes without requiring self-disclosure. Use the complete worked example for review, teaching, or deeper refinement.

## Sources

- [Readability guidance](https://readability.edutools.fyi)
- [Public `readability-skill` repository](https://github.com/techczech/readability-skill)
- [Five principles of readability](https://github.com/techczech/readability-skill/blob/main/references/five-principles.md)
- [Reading strategies](https://github.com/techczech/readability-skill/blob/main/references/reading-strategies.md)
- [Accessibility considerations](https://github.com/techczech/readability-skill/blob/main/references/accessibility.md)
- [Document tips](https://github.com/techczech/readability-skill/blob/main/references/document-tips.md)

These public foundations inform the working draft. The five-dimension model and its application to continuity across interactions remain provisional and should be refined through examples and user feedback.
