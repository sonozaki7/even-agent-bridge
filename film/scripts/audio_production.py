#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11,<3.13"
# dependencies = [
#   "kokoro-mlx==0.1.4",
#   "numpy==2.3.4",
#   "soundfile==0.14.0",
#   "en-core-web-sm @ https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl",
# ]
# ///
"""Generate the 82-second dialogue, original score, mix and caption timeline."""

from __future__ import annotations

import argparse
import json
import math
import re
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

RATE = 48_000
DURATION = 82
FILM = Path(__file__).resolve().parents[1]
MODEL_ID = "mlx-community/Kokoro-82M-bf16"
MODEL_REVISION = "a71e4d38b236d968966a2002c4c895dbd12b1c3c"

# Caption slot start, hard end, caption text, voice speed. The actual caption
# end is derived from rendered samples, not the planned end of the slot.
SCRIPT = [
    (0.46, 4.94, "Let me show you what I want to do with G2, alongside T3 Code.", 0.98),
    (
        5.30,
        9.61,
        "In T3 Code, a thread is one job and the conversation around it.",
        0.98,
    ),
    (9.72, 13.01, "Most threads can keep moving, or finish, without me.", 0.96),
    (13.12, 16.81, "I only get a nudge when there’s a choice to make.", 0.97),
    (17.55, 21.96, "On a walk, I stop and open the note in my glasses.", 0.96),
    (22.58, 27.61, "I’m not ready to decide, so I tap Later on the ring.", 0.94),
    (29.32, 32.53, "Waiting for the Shinkansen, I reopen the thread.", 0.97),
    (32.68, 36.61, "Newer phones are ready. Older phones need more testing.", 0.98),
    (
        36.82,
        40.84,
        "Give newer phones the new search first, or wait for everyone?",
        1.00,
    ),
    (
        41.26,
        45.82,
        "Before I choose, I ask: will search still work on older phones?",
        0.97,
    ),
    (
        46.28,
        50.71,
        "Later, the answer comes back. Yes. They’ll keep today’s search.",
        0.97,
    ),
    (51.35, 56.51, "Good. I choose Newer phones first, and confirm the reply.", 0.95),
    (56.84, 61.41, "That’s my decision. The agents can take it from here.", 0.95),
    (62.39, 65.97, "Back in conversation, nothing interrupts.", 0.96),
    (66.40, 71.71, "At a pause: no decisions waiting. The agents are testing.", 0.95),
    (
        72.24,
        77.54,
        "The checks pass, and the change merges under rules already in place.",
        0.96,
    ),
    (77.90, 80.54, "Only the work that needs you.", 0.91),
]
PRONUNCIATION = {
    "T3": "Tee three",
    "G2": "Gee two",
    "R1": "R one",
    "Shinkansen": "[Shinkansen](/ʃˈɪŋkɑnsˌɛn/)",
}


def ffmpeg(*args: str) -> None:
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args],
        check=True,
    )


def samples(seconds: float) -> int:
    return round(seconds * RATE)


def stamp(seconds: float) -> str:
    ms = round(seconds * 1000)
    return (
        f"{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02},{ms % 1000:03}"
    )


def ramp(t: np.ndarray, a: float, b: float) -> np.ndarray:
    x = np.clip((t - a) / (b - a), 0, 1)
    return x * x * (3 - 2 * x)


def trim_dialogue(wave: np.ndarray) -> np.ndarray:
    # Find edges using a 10 ms energy envelope, retaining consonants and tails.
    block = samples(0.01)
    padded = np.pad(wave, (0, (-len(wave)) % block))
    rms = np.sqrt(np.mean(padded.reshape(-1, block) ** 2, axis=1))
    active = np.flatnonzero(rms >= max(0.0015, np.max(rms) * 0.011))
    if not len(active):
        raise ValueError("Voice synthesis produced no dialogue")
    lo = max(0, (active[0] - 3) * block)
    hi = min(len(wave), (active[-1] + 7) * block)
    audio = wave[lo:hi].copy()
    fade = samples(0.012)
    audio[:fade] *= np.linspace(0, 1, fade)
    audio[-fade:] *= np.linspace(1, 0, fade)
    return audio


def say(tts, text: str, voice: str, speed: float) -> np.ndarray:
    # The voice spelling is intentionally separate from subtitle spelling.
    for original, phonetic in PRONUNCIATION.items():
        text = re.sub(rf"\b{original}\b", phonetic, text)
    text = text.replace("“", "").replace("”", "")
    return trim_dialogue(
        tts.generate(text, voice=voice, speed=speed, sample_rate=RATE).audio
    )


def synth_dialogue(tts, voice: str) -> tuple[np.ndarray, list[dict]]:
    timeline = np.zeros(samples(DURATION), dtype=np.float32)
    captions = []
    for start, deadline, caption, speed in SCRIPT:
        wave = say(tts, caption, voice, speed)
        slot = deadline - start - 0.05
        for _ in range(3):
            if len(wave) <= samples(slot):
                break
            speed *= len(wave) / samples(slot) * 1.025
            if speed > 1.25:
                raise ValueError(f"Line won't fit naturally at {start:.2f}s: {caption}")
            wave = say(tts, caption, voice, speed)
        else:
            if len(wave) > samples(slot):
                raise ValueError(f"Line won't fit at {start:.2f}s: {caption}")
        end = start + len(wave) / RATE
        timeline[samples(start) : samples(start) + len(wave)] = wave
        captions.append(
            {
                "start": round(start - 0.03, 3),
                "end": round(min(deadline, end + 0.05), 3),
                "text": caption,
            }
        )
        print(f"{start:05.2f}–{end:05.2f}  {speed:.2f}×  {caption}", flush=True)
    return timeline, captions


class Score:
    def __init__(self) -> None:
        self.song = np.zeros((samples(DURATION), 2), dtype=np.float32)
        self.rng = np.random.default_rng(67215)

    def add(
        self, wave: np.ndarray, start: float, gain: float, pan: float = 0.0
    ) -> None:
        i = samples(start)
        n = min(len(wave), len(self.song) - i)
        angle = (pan + 1.0) * np.pi / 4
        self.song[i : i + n, 0] += gain * wave[:n] * math.cos(angle)
        self.song[i : i + n, 1] += gain * wave[:n] * math.sin(angle)

    def t(self, duration: float) -> np.ndarray:
        return np.arange(samples(duration), dtype=np.float64) / RATE

    def pad(self, start: float, duration: float, notes: list[int], gain: float) -> None:
        t = self.t(duration)
        edge = ramp(t, 0, min(0.92, duration / 3)) * (
            1 - ramp(t, duration - 1.4, duration)
        )
        for k, midi in enumerate(notes):
            hz = 440 * 2 ** ((midi - 69) / 12)
            wobble = 0.15 * np.sin(2 * np.pi * (0.16 + 0.04 * k) * t + k)
            q = 2 * np.pi * hz * t
            a = (
                (
                    0.80 * np.sin(q + wobble + k)
                    + 0.27 * np.sin(2 * q - wobble)
                    + 0.12 * np.sin(3 * q + 0.18 * np.sin(q))
                )
                * edge
                * (0.91 + 0.09 * np.sin(2 * np.pi * (0.3 + 0.12 * k) * t + 1.2))
            )
            b = (0.47 * np.sin(q * 1.0013 - wobble) + 0.16 * np.sin(q * 2.003)) * edge
            pan = (-0.5, 0.56, -0.27, 0.35, 0)[k % 5]
            self.add(a, start, gain * (0.85 if k else 1.2), pan)
            self.add(b, start + 0.06, gain * 0.72, -pan)

    def pluck(
        self,
        start: float,
        note: int,
        gain: float,
        pan: float = 0.0,
        decay: float = 0.21,
    ) -> None:
        t = self.t(1.35)
        hz = 440 * 2 ** ((note - 69) / 12)
        q = 2 * np.pi * hz * t
        wave = (
            (
                0.79 * np.sin(q + 0.52 * np.sin(2.001 * q) * np.exp(-t * 8))
                + 0.22 * np.sin(2.007 * q) * np.exp(-t * 7)
                + 0.10 * np.sin(3.024 * q) * np.exp(-t * 11)
            )
            * ramp(t, 0, 0.009)
            * np.exp(-t / decay)
            * (1 - ramp(t, 1.16, 1.35))
        )
        self.add(wave, start, gain, pan)
        self.add(wave, start + 0.22, gain * 0.22, -0.71)
        self.add(wave, start + 0.45, gain * 0.11, 0.69)

    def kick(self, start: float, gain: float, long: bool = False) -> None:
        t = self.t(1.5 if long else 0.37)
        # Analytic integral for a clean downward pitch sweep.
        phase = 2 * np.pi * (49 * t + 49 * 0.036 * (1 - np.exp(-t / 0.036)))
        wave = (np.sin(phase) + 0.12 * np.sin(phase * 2)) * ramp(t, 0, 0.013)
        self.add(wave * np.exp(-t / (0.31 if long else 0.076)), start, gain)

    def brush(
        self, start: float, gain: float, pan: float = 0.0, length: float = 0.09
    ) -> None:
        t = self.t(length)
        raw = self.rng.normal(0, 1, len(t))
        # Remove the lows without a hard high-pass transient.
        noise = (raw - np.roll(raw, 2)) * 0.28
        shape = ramp(t, 0, 0.006) * (1 - ramp(t, 0.01, length)) ** 2
        self.add(noise * shape, start, gain, pan)

    def air(self, apex: float, before: float, after: float, gain: float) -> None:
        t = self.t(before + after)
        raw = self.rng.normal(0, 1, len(t) + 63)
        box = np.hanning(64)
        noise = np.convolve(raw, box / box.sum(), mode="valid")
        envelope = ramp(t, 0, before) ** 2 * (1 - ramp(t, before, before + after)) ** 2
        self.add(noise * envelope, apex - before, gain * 0.68, -0.6)
        self.add(np.roll(noise, 325) * envelope, apex - before, gain, 0.62)

    def felt(self, start: float, note: int, gain: float, pan: float) -> None:
        """Soft struck key, with inharmonic upper partials and stereo room tail."""
        t = self.t(2.4)
        hz = 440 * 2 ** ((note - 69) / 12)
        q = 2 * np.pi * hz * t
        tone = np.zeros_like(t)
        for partial, detune, level, decay in [
            (1, 0.0, 0.80, 0.72),
            (2, 0.001, 0.22, 0.39),
            (3, 0.002, 0.13, 0.27),
            (4, 0.004, 0.065, 0.16),
            (6, 0.007, 0.028, 0.13),
        ]:
            tone += (
                level
                * np.sin(q * partial * (1 + detune) + partial / 3)
                * np.exp(-t / decay)
            )
        tone *= ramp(t, 0, 0.013) * (1 - ramp(t, 2.1, 2.4))
        self.add(tone, start, gain, pan)
        for delay, cross_pan, level in [
            (0.13, -0.63, 0.18),
            (0.24, 0.62, 0.11),
            (0.38, -0.25, 0.055),
        ]:
            self.add(tone, start + delay, gain * level, cross_pan)

    def texture(self, start: float, duration: float, mode: str, gain: float) -> None:
        """Procedural outdoor, platform, and room air; no recorded sound."""
        t = self.t(duration)
        edge = ramp(t, 0, 0.8) * (1 - ramp(t, duration - 1.0, duration))
        for sign in (-1, 1):
            raw = self.rng.normal(0, 1, len(t))
            f = np.fft.rfftfreq(len(t), 1 / RATE)
            low, high = {"walk": (135, 860), "platform": (60, 640), "room": (115, 420)}[
                mode
            ]
            # Smooth band-shaping keeps air below the narrator's clarity range.
            band = (1 - np.exp(-((f / low) ** 2))) * np.exp(-((f / high) ** 2))
            tone = np.fft.irfft(np.fft.rfft(raw) * band, len(t))
            if mode == "platform":
                phase = 2 * np.pi * (49 * t + 0.26 * np.sin(2 * np.pi * 0.17 * t))
                tone += (
                    0.045
                    * (np.sin(phase) + 0.23 * np.sin(2.01 * phase))
                    * (0.9 + 0.1 * np.cos(2 * np.pi * 0.93 * t))
                )
            self.add(tone * edge, start, gain, 0.65 * sign)

    def chime(self, start: float, notes: list[int], gain: float) -> None:
        for i, note in enumerate(notes):
            self.pluck(
                start + i * 0.108, note, gain / (1 + i * 0.25), (-1) ** i * 0.27, 0.22
            )


def synth_score() -> np.ndarray:
    s = Score()
    # Airy D-major score. Add-nine voicings give the scenes room to breathe;
    # the same felt-key figure follows the thread from screen to street to platform.
    chords = [
        (0.0, 6.65, [38, 57, 61, 64, 66], 0.025),
        (5.05, 7.82, [43, 54, 59, 62, 69], 0.031),
        (11.25, 6.96, [35, 54, 57, 61, 62], 0.028),
        (16.61, 6.98, [40, 55, 59, 62, 66], 0.023),
        (22.0, 7.92, [45, 55, 57, 59, 64], 0.025),
        (28.55, 7.98, [38, 57, 61, 64, 66], 0.038),
        (35.1, 6.85, [42, 57, 59, 62, 66], 0.031),
        (40.65, 6.74, [43, 54, 57, 59, 62], 0.028),
        (46.1, 6.33, [40, 55, 59, 62, 66], 0.025),
        (50.9, 6.72, [35, 54, 57, 61, 62], 0.029),
        (56.23, 7.33, [45, 55, 57, 59, 64], 0.031),
        (61.54, 11.24, [38, 54, 61, 64], 0.019),
        (71.25, 8.12, [43, 54, 59, 62, 69], 0.034),
        (77.15, 4.85, [38, 54, 57, 61, 64, 66], 0.041),
    ]
    for row in chords:
        s.pad(*row)

    for base, notes, gain in [
        (0.08, [66, 73, 76], 0.076),
        (5.0, [67, 71, 74, 81], 0.069),
        (10.9, [66, 69, 73, 74], 0.059),
        (16.98, [64, 67, 71, 78], 0.062),
        (22.3, [64, 69, 71], 0.041),
        (29.03, [66, 73, 76, 81], 0.080),
        (34.8, [66, 69, 73, 78], 0.062),
        (40.95, [67, 71, 74], 0.056),
        (46.04, [66, 71, 74, 76], 0.062),
        (51.06, [66, 69, 73, 74], 0.060),
        (57.1, [64, 69, 71, 76], 0.066),
        (62.1, [61, 66], 0.033),
        (68.9, [64, 69], 0.029),
        (72.0, [67, 71, 74, 78], 0.074),
        (77.62, [66, 73, 76, 81], 0.076),
    ]:
        for i, note in enumerate(notes):
            s.felt(
                base + (0.0, 0.58, 1.51, 2.53)[i],
                note,
                gain * (1 - 0.11 * i),
                (-1) ** i * 0.35,
            )

    # A muted brushed pulse enters at the desk and picks up on the platform.
    # Leave both walking and conversation free of a metronomic beat.
    for start, bars, gain in [(5.03, 5, 0.076), (29.0, 13, 0.092), (72.0, 2, 0.08)]:
        for i in range(bars):
            at = start + i * 2.5
            s.kick(at, gain)
            s.brush(at + 0.61, gain * 0.71, -0.21, 0.075)
            if i % 2:
                s.kick(at + 1.25, gain * 0.58)
            s.brush(at + 1.88, gain * 0.86, 0.28, 0.09)

    s.texture(16.7, 12.7, "walk", 0.066)
    s.texture(28.0, 34.8, "platform", 0.064)
    s.texture(61.85, 10.6, "room", 0.061)

    for apex, before, after, gain in [
        (5.0, 0.45, 0.33, 0.071),
        (17.0, 0.54, 0.63, 0.078),
        (29.0, 0.85, 0.61, 0.137),
        (41.0, 0.36, 0.29, 0.057),
        (46.12, 0.63, 0.28, 0.063),
        (51.0, 0.53, 0.41, 0.052),
        (62.0, 0.67, 0.53, 0.054),
        (72.0, 0.56, 0.48, 0.080),
        (77.62, 0.7, 0.53, 0.095),
    ]:
        s.air(apex, before, after, gain)
    for at, notes, gain in [
        (19.20, [73, 76], 0.066),  # Open on glasses.
        (25.30, [66], 0.046),  # Later: no send tone.
        (31.05, [73, 76], 0.059),  # Reopen the same thread.
        (44.90, [73, 78], 0.071),  # Question sent.
        (46.30, [71, 76], 0.070),  # Answer returns after the time cut.
        (53.40, [73], 0.052),  # Select an option.
        (57.50, [74, 78, 81], 0.075),  # Reply sent, not a permission grant.
        (73.75, [74, 78], 0.054),  # Tests / merge proof.
    ]:
        s.chime(at, notes, gain)
    s.kick(77.63, 0.11, long=True)
    time = np.arange(samples(DURATION)) / RATE
    s.song *= (ramp(time, 0, 0.14) * (1 - ramp(time, 79.6, DURATION - 0.01)))[:, None]
    return s.song


def mix(
    dialogue: np.ndarray,
    captions: list[dict],
    output: Path,
    audio_dir: Path,
    captions_path: Path,
) -> None:
    output.mkdir(parents=True, exist_ok=True)
    audio_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="even-audio-") as tmp:
        raw = Path(tmp) / "raw.wav"
        score = Path(tmp) / "score.wav"
        mix_path = Path(tmp) / "mix.wav"
        sf.write(raw, dialogue, RATE, subtype="FLOAT")
        # Bring spoken words forward without flattening cadence. Leave peak
        # headroom for both score and final AAC encode.
        ffmpeg(
            "-i",
            str(raw),
            "-af",
            "highpass=f=78,equalizer=f=280:t=q:w=0.85:g=-1.8,"
            "equalizer=f=3150:t=q:w=0.9:g=1.7,acompressor=threshold=0.12:ratio=2.4:attack=13:release=95,"
            "loudnorm=I=-18:TP=-2:LRA=8",
            "-ar",
            str(RATE),
            "-c:a",
            "pcm_s24le",
            str(output / "narration.wav"),
        )
        # A release ramp across each spoken phrase avoids audible pumping.
        time = np.arange(samples(DURATION)) / RATE
        duck = np.ones(len(time), dtype=np.float32)
        for caption in captions:
            start, end = caption["start"], caption["end"]
            envelope = ramp(time, max(0, start - 0.14), start) * (
                1 - ramp(time, end, end + 0.32)
            )
            duck = np.minimum(duck, 1 - 0.42 * envelope)
        sf.write(score, synth_score() * duck[:, None] * 0.86, RATE, subtype="FLOAT")
        ffmpeg(
            "-i",
            str(output / "narration.wav"),
            "-i",
            str(score),
            "-filter_complex",
            "[0:a]pan=stereo|c0=c0|c1=c0[vo];[vo][1:a]"
            "amix=inputs=2:normalize=0:duration=shortest,"
            "loudnorm=I=-16:TP=-1.5:LRA=9",
            "-ar",
            str(RATE),
            "-c:a",
            "pcm_s24le",
            str(mix_path),
        )
        ffmpeg(
            "-i",
            str(mix_path),
            "-c:a",
            "libmp3lame",
            "-b:a",
            "256k",
            str(audio_dir / "master-mix.mp3"),
        )
    srt = (
        "\n\n".join(
            f"{i}\n{stamp(c['start'])} --> {stamp(c['end'])}\n{c['text']}"
            for i, c in enumerate(captions, start=1)
        )
        + "\n"
    )
    (output / "subtitles.srt").write_text(srt, encoding="utf-8")
    captions_path.parent.mkdir(parents=True, exist_ok=True)
    captions_path.write_text(
        json.dumps(captions, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--model-dir", type=Path, help="Reuse a previously downloaded model snapshot"
    )
    parser.add_argument("--voice", default="af_heart")
    parser.add_argument(
        "--audition", type=Path, help="Only generate a short voice sample at this path"
    )
    parser.add_argument("--output", type=Path, default=FILM.parent / "output")
    parser.add_argument("--audio-dir", type=Path, default=FILM / "public" / "audio")
    parser.add_argument(
        "--captions-path", type=Path, default=FILM / "src" / "captions.json"
    )
    args = parser.parse_args()

    from kokoro_mlx import KokoroTTS

    model_dir = args.model_dir
    if model_dir is None:
        from huggingface_hub import snapshot_download

        model_dir = snapshot_download(
            MODEL_ID,
            revision=MODEL_REVISION,
            allow_patterns=[
                "config.json",
                "kokoro-v1_0.safetensors",
                f"voices/{args.voice}.safetensors",
            ],
            token=False,
        )
    with KokoroTTS.from_pretrained(model_dir) as tts:
        if args.audition:
            parts = [
                say(tts, SCRIPT[i][2], args.voice, SCRIPT[i][3]) for i in (0, 2, 8, 13)
            ]
            sf.write(
                args.audition,
                np.concatenate([np.r_[p, np.zeros(samples(0.34))] for p in parts]),
                RATE,
            )
            return
        dialogue, captions = synth_dialogue(tts, args.voice)
        mix(dialogue, captions, args.output, args.audio_dir, args.captions_path)


if __name__ == "__main__":
    main()
