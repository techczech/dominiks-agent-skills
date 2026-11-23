---
title: Voice for animated talk videos
register: FOR AGENTS
date: 2026-11-13
status: single home for narration voice, pace, takes, word times, loudness and cloning authorisation (N6, N46 voice side, N67, N77, N81 music, brief section 6). The preset text stays in `text-to-speech`.
---

# Voice

Step 7 of the flow. Input: the approved script. Output: `audio/voice.m4a`, `durations.json`, word times.

## Narrator

- **N77 House narrator.** Unless he names another voice: Breeze TTS 2, profile `B4-podcast-host-male`, cloned from the audition take he chose, passing that take and its exact transcript as the reference for every scene. His choices: "voice it with a stock brit voice"; "breeze... slightly more dynamic as a presenter not just declaim"; "key thing it does not use the correct intonation at the end of sentences - rises instead of falls"; "male voice is better". A second voice, when a video needs two: `B6-radio4-documentary-female-brisker`.
- Preset text, rejected descriptions and Breeze lessons: `text-to-speech`, `references/voice-presets-breeze-tts.md`. Pass the full description to `--voice`, not the preset name.
- Reference set (`breeze-voice.txt`, `breeze-reference.wav`, `breeze-reference.txt`, voice scripts): copy the user's authorised set into each new video. `references/local-voice-sources.md`, a local note not in the published skill, may name where the user's own sets and audition clips live. No set: a stock synthetic voice or the user's own authorised recording.
- Never: Kokoro stock voices; a declaiming "calm narrator" description; an excited "engaged lecturer" description; takes whose sentences end rising. This overrides `text-to-speech` `references/paper-reading.md` for paper explainers.
- **N6** (16 Oct: "a better source for the cloned voice and less disjointed over the slides") is met by the reference set, section takes and clean joins below.
- Stories (N81): one designed voice per character, fitting the brief. Background music only when he asks: an open model (ACE-Step, `text-to-speech`), several takes for him to choose from, mixed about 14 dB under the voices and ducked under speech, dialogue checked by transcription.

## Authorisation and labelling

- Clone only from audio you are authorised to use: his own, recorded for this purpose, or a speaker who has agreed in writing. Never a colleague, a public speaker or a recording of unclear provenance. If unsure, use a stock synthetic voice.
- Label synthetic or cloned narration as synthetic in the video description and the report; say whose voice it was cloned from when it is a person.
- A poor reference: say so and use a plain synthetic draft voice; do not ship a cloned voice you judge disjointed.

## Pace (N67)

- "It's like somebody's reading a bedtime story. It should be snappy." Target about 150 words a minute (2.5 a second). Cloned B4 takes run about 2.4-2.6 words a second before the pause cap; measure the joined track and stretch with pitch kept (`atempo`) to the target. A brief may not cap the stretch (N75: the older "no stretch beyond atempo 1.03" is withdrawn). Asking Breeze for a brisker pace flattens the voice, so stretch rather than re-describe. Voiced videos outside 140-165 words a minute fail `[pre]`.
- Gaps: at most 0.15 s at joins between clips, at most about 0.35 s anywhere inside a take. `join-clips.mjs` defaults to 200 ms of silence; set it to 0.15 s or less, or trim, and report if you cannot.

## Takes

- One request per section (several scenes), so the bridge sentence keeps its intonation (N46). Same settings throughout; previous text passed as context where the engine supports it. `--max_tokens` of 20 per word (at least 600).
- Verify each take: transcribe it back and compare with the script letter for letter (spaces, case and punctuation ignored). On a difference retake, up to 3 takes per section; then report the section as unresolved with the differing words. Check sentence-final falls.
- Write the script as it is spoken (numerals as words, names respelled for the voice only, never in captions: `Lukeš` as `Lookesh`).
- Join with `join-clips.mjs`: each clip normalised to -16 LUFS; room tone from the reference if you have it. Listen to every join; one that sounds like a new recording is a defect to fix.
- Scene length follows the voice: re-plan from `durations.json`, then cue builds from the new word times.

## Word times

- Synthetic narration: the script is known, the times are not. Transcribe the generated audio (`uv run scripts/transcribe-words.py audio/voice.m4a words.json`, Parakeet; sub-word tokens), then align the script's letters to the transcript's with `node tools/align-words.mjs --script script.json --transcript words.json --out aligned.json`. Display words keep the script's spelling; times come from the audio. It stops at the first letter that differs: write the script as spoken, or retake.
- His own recording (route B), or a transcript where terms matter: the `speech-to-text` skill (Qwen3-ASR with a term list for quality). Any engine with word timestamps works.

## Loudness

`audio.volume` is not linear in the render. Measure the rendered MP4 (`ffmpeg -hide_banner -nostats -i renders/x.mp4 -af ebur128 -f null - 2>&1 | grep -A1 Integrated`) and tune `volume` to -16 LUFS within 0.5. Starting points for a track normalised to about -16 LUFS: volume 1.0 reads -13.9, 0.794 reads -15.0, 0.7 reads -16.1. Re-render or re-mux after each change `[pre]`.

## Report

Reference file used (path, length), engine and settings, takes per section, measured LUFS, words per minute, any join not made clean, any unresolved take.
