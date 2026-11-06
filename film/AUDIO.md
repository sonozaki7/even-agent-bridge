# Narration, music, and captions

The film uses **AI-generated American English narration**, synthesized locally
with [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) (Apache 2.0 model)
via the [Kokoro MLX implementation](https://github.com/gabrimatic/kokoro-mlx).
No voice was cloned and the narration does not represent an employee or
spokesperson for T3 Code, OpenAI, Anthropic, or Even Realities.

The 82-second score is new for this cut. The script synthesizes a felt-key
motif, soft pads, platform and room atmosphere, and a few interface tones
from oscillators and seeded noise. The conversation scene has no alert tone.
The film does not use a commercial track, stock sound, or external speech
service.

The ready-to-render stereo mix is `public/audio/master-mix.mp3`; the editable
caption timeline is `src/captions.json`. To rebuild audio and subtitles on Apple
Silicon with `uv`, Python 3.12, and FFmpeg installed:

```sh
cd film
uv run --python 3.12 --script scripts/audio_production.py
```

On its first run, the script downloads the pinned public model and one voice
from Hugging Face. Text-to-speech processing happens entirely on-device.
You can pass `--model-dir /path/to/the/model/snapshot` to use a local copy.
The script writes the voice-only WAV and SRT to the repo's `output/` directory
and refreshes both render assets in place.
