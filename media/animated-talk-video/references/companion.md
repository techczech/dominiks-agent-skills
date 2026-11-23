---
title: Companion page for animated talk videos
register: FOR AGENTS
date: 2026-11-13
status: single home for the companion rules (N63, N71, N72, N83-N86, N91) and the publishing recipe. `designing-visuals-for-learning` and the other skills point here.
---

# Companion

Step 12 of the flow. Every video ships with a companion page (N63). Dominik, 6 Nov: "for any graphic, any animation we do, we should also have a self-exploratory version that's an HTML that people can go through step by step and have control." Aim: people understand the thing better, not a polished artefact.

## What goes where

- **Video and talk screens:** pictures, one point per screen, no titles, no labels that restate the narration, no interface chrome, no self-study notes or captions (rules.md, D4, N59, N60).
- **Companion:** descriptive titles, notes per step, the full widget interface (self-study mode), sources with page references, links to the original.
- Every animated scene has a stepped version with the same states the video shows. Widgets have a video mode and a self-study mode.
- A slide deck gets a companion too: a summary per section, the talk's widgets in self-study mode, links. A recording alone is not enough.

## One companion app, not a scroll (N71, N72)

- Home hub: one card per way of learning, the chapter questions with times, progress kept in the browser.
- Video: chapter timeline and a searchable transcript that follows playback.
- Argument: organised by the source's argument, not the video. A real table of contents (questions, then numbered steps), an "In short" answer per part, steps behind thumbnails that open the build in a viewer, narration with the current cue marked, page reference and "watch this moment".
- Infographics in self-study mode (N83: this is the name).
- Key terms as a map linked to the screens that show them.
- Apply: the practical view, named for what it does and marked as our translation of the source. Long guides are not embedded; their unique parts (checklists, application) become their own views. Reading routes stay optional and off by default.
- Making: purpose, how an agent made it, the skills used with links; claims only the reviews that actually happened.
- Light and dark, keyboard control, works offline from `file://`. Views without data are left out.
- The video is embedded only when its timings match the outline. Chapters are the section card titles (N55, N56); each table-of-contents entry seeks the video and opens that section's step-through.

## A session with several videos (N85)

One companion for the whole session, not a playlist. Its Key points view (labelled "Key points", never "Argument" or "Follow the argument") follows the session's progression: one part per section or question, in the order the session built its case, each with an "In short" answer, the video that covers it embedded at that point, the step-through of that video's screens, the slides section, the key terms used there and a Try it (prompt, and how you know it worked). Also: key-terms map across the session, Apply (activities and Try its), Reading (slides handout, Notes, activities page), Making, and a Videos view that plays them in order. Build with `series` and `argument.parts` in `companion.json` (`inputs.md`, "Series input"); `--media-base ../videos` shares the hosted encodes. Start from the newest single-talk companion rather than a new design (author example: the Agentic AI Primer, `agent-primer-nature.semanticmachines.fyi`, is the template he named); `assets/sample-companion.json` shows the format. Conventions:

- Views he gave aloud that are not on a slide are attributed to him ("Dominik says").
- Apply steps are marked as our translation and add no inference he did not make.
- The page title is the session's own title.
- When the session had hands-on exercises, they get a self-study version: a plain-text guide for the participant's agent (`agentGuide` in `companion.json`, built to `self-study.md` beside the page), and a copyable prompt in the hero that points the agent at it (`copy.heroPrompt`). The guide's hand-written preamble overrides everything that needed the room (facilitator cues, Liveboard, workshop keys, live demonstrations) with a self-study equivalent, usually the video for that key point or a prepared example; the key points with their videos, exercises and Try its are generated below it.

## Playback controls (N83)

Under the video: labelled, focus-visible controls for play/pause, back/forward 10 s, previous/next chapter, speed (0.75, 1, 1.25, 1.5, 1.75, 2; always visible, remembered when storage is available), captions, mute, fullscreen, time. Keys: Space/K, arrows/J/L, Shift+arrows, `<` `>`, C, M, F, and a `?` shortcuts panel; never capture typing or platform chords. Works offline, in both themes and at phone width; transcript headings and search never overlap the lines; the chapter playhead never hides chapter numbers. Shared player: `scripts/embed-player.mjs`. Kit renders burn captions in, so the page adds no caption track; set `video.burnedCaptions: false` in `companion.json` for a video without them.

## Names and text (N84, N86, N91)

- **N84** A page, video or card title is the subject's own name (the talk or paper title, or a hook), never followed by a colon and a phrase saying what kind of document it is ("a summary", "a guide", "what the lecture argues").
- **N86** Titles, navigation, URLs and labels use the subject's own words and the reader's: the session title, its questions, Videos, Key terms, Try it. Words we used for the design intent (journey, narrative, follow-up, learning experience, stop, hub) are never a name, heading, label or path `[pre]`.
- **N91** Page text is written for the page's audience, usually the people who attended coming back to revise. The hero says in two or three plain sentences what the site is (a shortened overview of the session, for participants), what it is for (going back over the ideas; with exercises, pointing your agent at the guide to do them on your own) and where to start. Dominik's wording for the 9 Nov workshop: "A shortened overview of the full-day workshop, for participants. Point your agent at this guide to follow along with the practical exercises." Card text and intros never count or list the page's own parts and never explain controls the interface shows. Unslop every reader-facing string in `companion.json`, including `copy` and the kit defaults it overrides, before the page is shown. Quoted slide wording stays as he wrote it.

## Build

`node tools/companion.mjs . --out companion` builds the app from the outline, frames, `plan.json` or `scenes.json`, `cues.json`, `captions.vtt`, `chapters.txt` and the MP4. Each view appears only when `companion.json` has its data (`argument`, `concepts`, `research`, `making`, `skills`, `reading`; example `assets/sample-companion.json`, no colon subtitle). Section cards are left out of the step-through unless listed in `keepChapterScreens`. Before handing over, screenshot every view at desktop and phone width, light and dark, and look.

## Publish (Cloudflare Pages)

- Files are capped at 25 MB: point `video.file` at a web encode (`-preset slow -tune animation -crf 30 -c:a aac -b:a 96k -movflags +faststart`; 55 MB became 16 MB in 6 minutes of 1080p with no visible loss).
- Pages static assets ignore Range requests, so Safari will not play the video and chapter seeks fail. Deploy with a Pages Function `functions/media/[[path]].js` that answers Range with 206 (template `assets/pages-range-function.js`); check with `curl` that a Range request returns 206.
- A new project needs `wrangler pages project create --force` once (wrangler 4.15x delegates to Workers otherwise).
- The page's card and sharing image are `cover.jpg` and `cover-og.jpg`, cut from the video's title page (rules.md N65, N73). A video that does not open on one is not ready to publish; author example: on talks.dominiklukes.net the homepage card shows `media/cover.jpg`.
- Replace draft and copyright notices in `footer` before going public. Publishing third-party figure redraws is the owner's decision. Nothing is published before `node tools/prerelease.mjs .` passes and the privacy pass (N78) is repeated.
- Explainer tops use the shared player: `explainers` skill.
