# Only the Decisions That Need You

A 50-second independent concept film for **T3 Code × Even G2 × Even R1**.

> Let me show you what I want to do with G2, alongside T3 Code.

| Deliverable | File |
|---|---|
| Landscape master | `even-g2-t3-concept-16x9.mp4` · 1920×1080, H.264, 30 fps |
| Portrait edition | `even-g2-t3-concept-9x16.mp4` · 1080×1920, H.264, 30 fps |
| Thumbnail | [`thumbnail.png`](thumbnail.png) |
| Voice stem | `narration.wav` · 48 kHz, mono |
| English captions | [`subtitles.srt`](subtitles.srt) · both films also include open captions |

Get the exported files from the [GitHub release](https://github.com/sonozaki7/even-agent-bridge/releases/tag/v0.1.1). The source ships with the final sound mix and short phrase captions, so rendering does not require a speech provider.

## The engineering story

1. **Triage in T3 Code.** One thread needs a decision, another is working, and older work is settled. T3 Code [can surface Codex questions](https://github.com/pingdotgg/t3code/blob/322f6544dfad0a3c8a0c8cbecf2c7f7874b14268/docs/user/providers-codex.md#L79-L86); [settling a thread](https://github.com/pingdotgg/t3code/blob/322f6544dfad0a3c8a0c8cbecf2c7f7874b14268/docs/user/thread-sidebar.md#L162-L192) moves it out of the active list without deleting its history.
2. **Decide compatibility, not whether to run a test.** Older app versions still send and expect v1 sync cursors, the tokens that let them resume syncing. The concept surfaces the choice in G2: keep the old behavior for one release while new clients opt into v2, or retire v1 now. The R1 answers that specific question.
3. **Agents finish without routine interruptions.** In the fictional repo, agents implement the compatibility path, test that both clients can resume syncing, open a pull request, and merge only after required checks pass and an existing policy permits it. The compatibility answer grants no merge authority. The eligible finished thread moves to Settled, with its history intact. T3 Code's [pull-request watching](https://github.com/pingdotgg/t3code/blob/202d5b5616e3edf65706371e2b8a9c4f486d0a96/docs/user/source-control.md#L304-L320) is not itself automatic merge permission.

## What's real vs. simulated

This is a **film-only revision**. The [v0.1.0 demo package](https://github.com/sonozaki7/even-agent-bridge/releases/tag/v0.1.0) and optional local read-only bridge are unchanged. The package does not implement the compatibility prompt, R1 answers to real threads, background notifications, or automatic merges.

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
