# Only the Work That Needs You

An 82-second independent concept film for **T3 Code × Even G2 × Even R1**.

> Let me show you what I want to do with G2, alongside T3 Code.

| Deliverable | File |
|---|---|
| Landscape master | `even-g2-t3-concept-16x9.mp4` · 1920×1080, H.264, 30 fps |
| Portrait edition | `even-g2-t3-concept-9x16.mp4` · 1080×1920, H.264, 30 fps |
| Thumbnail | [`thumbnail.png`](thumbnail.png) |
| Voice stem | `narration.wav` · 48 kHz, mono |
| English captions | [`subtitles.srt`](subtitles.srt) · both films also include open captions |

Get the exported files from the [GitHub release](https://github.com/sonozaki7/even-agent-bridge/releases/tag/v0.1.2). The source ships with the final sound mix and short phrase captions, so rendering does not require a speech provider.

## One decision, across a day

| Time | What the viewer sees |
|---|---|
| 0:00–0:17 | **T3 Code:** one task and its conversation per thread. Sign-in work keeps running, help screens are settled with history kept, and a station-search decision moves to the top. |
| 0:17–0:29 | **On a walk:** stop off the path, open the question, and tap **Later**. The thread still needs an answer. |
| 0:29–1:02 | **Waiting for the Shinkansen, before boarding:** reopen the same thread. Ask **“Will search still work on older phones?”** with a suggested reply. After the answer comes back, choose **“Newer phones first”**, then confirm. Older phones keep the search they use today. |
| 1:02–1:10.5 | **In conversation:** routine progress stays quiet. At a natural pause, open a quick manual check: no decisions waiting; agents are testing. |
| 1:10.5–1:22 | **Later:** the answer is saved in the same thread. Checks pass; a separately authorized change is merged and the thread moves to Settled. Merged does not mean released to phones. |

## What's real vs. simulated

- **T3 Code behavior:** separate [threads for each task](https://github.com/pingdotgg/t3code/blob/322f6544dfad0a3c8a0c8cbecf2c7f7874b14268/docs/user/thread-sidebar.md#L1-L23), [questions in a Codex thread](https://github.com/pingdotgg/t3code/blob/322f6544dfad0a3c8a0c8cbecf2c7f7874b14268/docs/user/providers-codex.md#L79-L86), and [Working and Settled states](https://github.com/pingdotgg/t3code/blob/322f6544dfad0a3c8a0c8cbecf2c7f7874b14268/docs/user/thread-sidebar.md#L134-L192). The real T3 list can surface other events, such as failures or finished work. The concept shows how a wearable could filter those down to decisions.
- **Wearable interaction:** the text is a cinematic approximation of [Even G2’s green display](https://hub.evenrealities.com/docs/build/display). [Even R1 supports scroll and tap input](https://hub.evenrealities.com/docs/build/device-apis#inputs). The thread alert, deferral, suggested question, reply, decision, and receipt are simulated; no physical hardware, background delivery, locked-phone reliability, or recording was demonstrated.
- **Permission:** the ring replies to the thread. It does not grant permission to merge or deploy. The fictional merge follows rules already in place, and the scenario does not depict a live release.
- **Production:** this film uses a new script, visual sequence, original music, and generated imagery. No official product photos, stock footage, or app screenshots are redistributed. See [visual production notes](../film/VISUALS.md) and [audio production](../film/AUDIO.md).
- **App status:** this is a film-only release. The [v0.1.0 app demo](https://github.com/sonozaki7/even-agent-bridge/releases/tag/v0.1.0) and read-only bridge are unchanged.

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
