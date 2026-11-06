# The Future of Coding Doesn’t Need a Desk

A 50-second independent concept film for **T3 Code × Even G2 × Even R1**. Start multiple agents, walk away, see the one update that matters, and imagine choosing the next step on the ring.

| Deliverable | File |
|---|---|
| Landscape master | `even-g2-t3-concept-16x9.mp4` · 1920×1080, H.264, 30 fps |
| Portrait edition | `even-g2-t3-concept-9x16.mp4` · 1080×1920, H.264, 30 fps |
| Thumbnail | [`thumbnail.png`](thumbnail.png) |
| Voice stem | `narration.wav` · 48 kHz, mono |
| English captions | [`subtitles.srt`](subtitles.srt) · both films also include open captions |

Get the exported files from the [GitHub release](https://github.com/sonozaki7/even-agent-bridge/releases/tag/v0.1.0). The source ships with the final sound mix and short phrase captions, so rendering does not require a speech provider.

## What the film shows

- The workspace and mobile screens are illustrative interfaces, not captures of the shipped T3 Code UI.
- The green heads-up display is a cinematic visualization, not a measurement of the actual field of view. Ring selection, confirmation, notification delivery, and resumed work are simulated. No hardware or production integration was used in the film.
- The G2 and R1 are **AI-generated product illustrations** using [Even G2](https://www.evenrealities.com/smart-glasses) and [Even R1](https://www.evenrealities.com/en-GB/smart-ring) product references for shape. Official photos are not redistributed. The lifestyle plates were also generated. See [visual production notes](../film/VISUALS.md).
- **AI-generated narration** uses the local Kokoro English voice model. Original music and sound effects were synthesized for the film. No commercial songs or stock footage. See [audio production and credits](../film/AUDIO.md).

## Render again

With Node.js 22.13+ from the repository root:

```sh
npm --prefix film ci
npm --prefix film run check
npm --prefix film run render
npm --prefix film run render:vertical
npm --prefix film run thumbnail
```

The first render downloads Remotion's headless browser if needed. No credentials are required. The editable scenes are in [`film/src/scenes/`](../film/src/scenes/); [`film/src/index.tsx`](../film/src/index.tsx) is the timeline. FFmpeg was used to prepare assets and verify the exports. Use of the rendering engine is governed by [Remotion's license](https://www.remotion.dev/docs/license).
