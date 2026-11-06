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
"""Generate the 50-second dialogue, original score, mix and caption timeline."""

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
DURATION = 50
FILM = Path(__file__).resolve().parents[1]
MODEL_ID = "mlx-community/Kokoro-82M-bf16"
MODEL_REVISION = "a71e4d38b236d968966a2002c4c895dbd12b1c3c"

# Caption slot start, hard end, caption text, voice speed. The actual caption
# end is derived from rendered samples, not the planned end of the slot.
SCRIPT = [
    (0.46, 5.81, "Let me show you what I want to do with G2, alongside T3 Code.", 0.98),
    (
        6.35,
        10.13,
        "T3 Code separates settled work from threads that need your input.",
        0.98,
    ),
    (10.25, 13.68, "Agents build, test, and merge under repo rules.", 0.98),
    (14.27, 17.62, "Here, I’m moving our mobile Sync API to version two.", 1.01),
    (17.74, 20.90, "But older clients still read version one cursors.", 0.99),
    (21.38, 24.65, "Retire version one now, and those clients lose sync.", 0.99),
    (24.76, 27.13, "G2 could show me just that decision.", 1.0),
    (27.22, 30.76, "With R1, I’d confirm: keep v1 for one release.", 0.98),
    (31.53, 35.2, "Agents add compatibility and regression-test both versions.", 0.99),
    (35.33, 37.97, "Then they merge the pull request under policy.", 0.99),
    (38.03, 40.87, "The thread is settled. No routine approvals.", 0.99),
    (41.57, 44.99, "Only the decisions that need you.", 0.92),
    (45.55, 49.23, "That’s what I want to build with Even Realities.", 0.96),
]
PRONUNCIATION = {
    "T3": "Tee three",
    "G2": "Gee two",
    "R1": "R one",
    "v1": "version one",
    "API": "A.P.I.",
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
        self.rng = np.random.default_rng(2305)

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

    def chime(self, start: float, notes: list[int], gain: float) -> None:
        for i, note in enumerate(notes):
            self.pluck(
                start + i * 0.092, note, gain / (1 + i * 0.22), (-1) ** i * 0.37, 0.28
            )


def synth_score() -> np.ndarray:
    s = Score()
    # F major / D minor color, slow-fading layers with shared notes. Motif
    # follows the edit: distant opening, sharper pulse, open-air lift, resolve.
    pads = [
        (0.0, 7.1, [38, 57, 60, 64], 0.033),
        (5.8, 8.9, [34, 53, 57, 60, 64], 0.039),
        (13.4, 8.6, [41, 55, 60, 64, 69], 0.034),
        (20.4, 6.0, [36, 55, 58, 62], 0.031),
        (25.4, 6.4, [38, 53, 57, 60, 64], 0.037),
        (30.2, 5.9, [34, 53, 57, 60, 64], 0.042),
        (34.6, 5.3, [36, 55, 57, 62], 0.041),
        (38.5, 4.1, [40, 55, 60, 62], 0.034),
        (40.85, 9.15, [41, 53, 57, 60, 64], 0.054),
        (41.10, 8.9, [48, 67, 69, 72, 76], 0.018),
    ]
    for row in pads:
        s.pad(*row)
    beat = 2 / 3
    for index in range(2, 61):
        moment = index * beat
        if (
            13.4 < moment < 16.7
            or 20.7 < moment < 22.0
            or 26.85 < moment < 28.3
            or moment > 40.4
        ):
            continue
        if index % 2 == 0:
            s.kick(moment, 0.078 if moment < 6 else (0.138 if moment > 30 else 0.10))
        if 6.0 <= moment and index % 4 in (1, 3):
            s.brush(moment + 0.02, 0.15 if moment > 30 else 0.105, 0.27)
        if 6.0 <= moment and index % 4 in (1, 2, 3):
            s.brush(moment + beat / 2, 0.067, -0.44, 0.060)
    for base, notes, gain in [
        (0.11, [62, 69, 64], 0.054),
        (6.07, [60, 65, 69, 72, 64, 69], 0.046),
        (9.4, [60, 65, 69, 72, 64, 65], 0.052),
        (14.06, [64, 69, 72, 76], 0.041),
        (17.38, [60, 64, 67, 69, 72], 0.046),
        (22.02, [62, 67, 70, 74], 0.032),
        (28.1, [60, 65, 69, 74, 76], 0.039),
        (31.08, [65, 69, 72, 76, 77, 81], 0.055),
        (34.43, [67, 72, 74, 79, 81, 84], 0.050),
        (37.80, [64, 67, 72, 76, 79], 0.044),
        (41.04, [65, 72, 76, 81], 0.078),
        (46.17, [69, 72, 77], 0.043),
    ]:
        for i, note in enumerate(notes):
            s.pluck(
                base + (0.0, 0.67, 1.32, 1.99, 2.32, 2.66)[i],
                note,
                gain * (1 - 0.067 * i),
                (-1) ** i * 0.34,
            )
    for apex, before, after, gain in [
        (6.0, 0.64, 0.36, 0.10),
        (14.0, 0.9, 0.65, 0.14),
        (17.30, 0.37, 0.60, 0.06),
        (31.0, 0.72, 0.28, 0.12),
        (34.3, 0.25, 0.26, 0.08),
        (37.7, 0.28, 0.27, 0.08),
        (41.0, 1.15, 0.97, 0.23),
        (45.7, 0.57, 0.60, 0.065),
    ]:
        s.air(apex, before, after, gain)
    for at, notes, gain in [
        (17.30, [72, 77], 0.045),
        (21.30, [74, 77], 0.14),
        (25.70, [74], 0.095),
        (27.40, [72, 77, 81], 0.12),
        (34.34, [77], 0.042),
        (37.74, [79], 0.047),
        (45.70, [72, 77], 0.053),
    ]:
        s.chime(at, notes, gain)
    s.kick(41.01, 0.19, long=True)
    s.kick(45.7, 0.075, long=True)
    time = np.arange(samples(DURATION)) / RATE
    s.song *= (ramp(time, 0, 0.14) * (1 - ramp(time, 48.95, 49.99)))[:, None]
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
