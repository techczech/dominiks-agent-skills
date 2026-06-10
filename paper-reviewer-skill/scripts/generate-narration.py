#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["mlx-audio>=0.3", "soundfile", "numpy"]
#
# [tool.uv]
# prerelease = "allow"
# ///
"""Generate TTS narration of Bean et al. 2026 paper highlights."""

import subprocess
import numpy as np
import soundfile as sf
from mlx_audio.tts.utils import load_model

# Narration segments with emotional direction
SEGMENTS = [
    {
        "text": "Reliability of LLMs as Medical Assistants for the General Public. A narration of key findings from Bean and colleagues, published in Nature Medicine, 2026.",
        "instruct": "Professional, warm, clear podcast host voice. Measured pace.",
    },
    {
        "text": "This study tested whether large language models can assist members of the public in identifying underlying conditions and choosing a course of action in ten medical scenarios. 1,298 participants were randomly assigned to receive assistance from an LLM, either GPT-4o, Llama 3, or Command R+, or a source of their choice as a control.",
        "instruct": "Informative, steady, clear academic narration.",
    },
    {
        "text": "Here is the central finding. Tested alone, LLMs complete the scenarios accurately, correctly identifying conditions in 94.9% of cases and disposition in 56.3% on average. However, participants using the same LLMs identified relevant conditions in fewer than 34.5% of cases and disposition in fewer than 44.2%. Both were no better than the control group.",
        "instruct": "Emphasizing a surprising and important finding. Slight dramatic pause before the 'However'.",
    },
    {
        "text": "Breaking this down by model, the models were able to suggest at least one relevant condition in 94.7% of cases for GPT-4o, 99.2% for Llama 3, and 90.8% for Command R+. These are impressive numbers when the models work on their own.",
        "instruct": "Confident, data-driven delivery. Slightly impressed tone.",
    },
    {
        "text": "However, accuracy in recommending dispositions was lower across the board. 64.7% for GPT-4o, 48.8% for Llama 3, and 55.5% for Command R+.",
        "instruct": "Measured, noting a contrast. Slightly cautionary tone.",
    },
    {
        "text": "What about the human interaction? The researchers found that user final responses had only slightly better precision, at 38.7%, than the combination of all intermediate conditions mentioned by LLMs. This indicates that participants may not be able to identify the best conditions suggested by LLMs.",
        "instruct": "Thoughtful, analytical. Highlighting a key insight.",
    },
    {
        "text": "To understand why, the team analyzed a random selection of 30 interactions, one for each combination of model and scenario. They recorded whether users provided sufficient information, the accuracy of model suggestions, and whether users followed the model's recommendations.",
        "instruct": "Methodical, clear explanatory tone. Academic but accessible.",
    },
    {
        "text": "The qualitative analysis revealed that users often failed to provide models with sufficient information. In 16 of 30 sampled interactions, initial messages contained only partial information. In 7 of those 16, users mentioned additional symptoms later, either in response to a model question or independently.",
        "instruct": "Engaged, revealing key findings. Building understanding.",
    },
    {
        "text": "The LLMs themselves also generated misleading information. In two cases, LLMs provided initially correct responses but added incorrect ones after users provided additional details. In two other cases, LLMs narrowly expanded on a single term like 'pre-eclampsia' or 'Saudi Arabia' that was not central to the scenario.",
        "instruct": "Slightly concerned, highlighting problems. Clear and precise.",
    },
    {
        "text": "Finally, participants employed a broad range of strategies. Several users primarily asked closed-ended questions like 'Could this be related to stress?', which constrained the LLM's possible responses. Even more striking, when asked to justify their choices, two users appeared to have made decisions by anthropomorphizing the LLMs, saying things like 'the AI seemed pretty confident'.",
        "instruct": "Intrigued, conveying a fascinating behavioral finding. Warm but scholarly.",
    },
    {
        "text": "In summary, this study shows that while LLMs achieve impressive results on medical scenarios when tested alone, real human users fail to benefit from them. Standard benchmarks do not predict these failures. The authors recommend systematic human user testing before public deployment in healthcare.",
        "instruct": "Conclusive, authoritative. Professional wrap-up with gravitas.",
    },
]

OUTPUT_DIR = "./articles"
WAV_PATH = f"{OUTPUT_DIR}/JZUBTJM9-bean-2026-narration.wav"
MP3_PATH = f"{OUTPUT_DIR}/JZUBTJM9-bean-2026-narration.mp3"

def main():
    print("Loading Qwen3-TTS model...")
    model = load_model("mlx-community/Qwen3-TTS-12Hz-0.6B-CustomVoice-bf16")

    all_audio = []
    sample_rate = None

    for i, seg in enumerate(SEGMENTS):
        print(f"Generating segment {i+1}/{len(SEGMENTS)}: {seg['text'][:60]}...")
        results = list(model.generate_custom_voice(
            text=seg["text"],
            speaker="Ryan",
            language="English",
            instruct=seg["instruct"],
        ))
        audio_np = np.array(results[0].audio, dtype=np.float32)
        sample_rate = results[0].sample_rate
        all_audio.append(audio_np)
        # Add pause between segments (0.6s)
        all_audio.append(np.zeros(int(sample_rate * 0.6), dtype=np.float32))

    full_audio = np.concatenate(all_audio)
    print(f"Writing WAV ({len(full_audio)/sample_rate:.1f}s at {sample_rate}Hz)...")
    sf.write(WAV_PATH, full_audio, sample_rate)

    print("Converting to MP3...")
    subprocess.run(
        ["ffmpeg", "-y", "-i", WAV_PATH, "-codec:a", "libmp3lame", "-qscale:a", "2", MP3_PATH],
        check=True, capture_output=True,
    )
    print(f"Done! Output: {MP3_PATH}")

if __name__ == "__main__":
    main()
