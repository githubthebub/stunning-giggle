# video-pipeline

The pipeline that produced **`final.mp4`** — *"AI Built a Complete Pokémon Game
From Scratch"* (74s, 1280×720) — and **`thumbnail.png`**, entirely from assets
this repo owns.

## What's in here

| path | what it is |
| --- | --- |
| `final.mp4` | The finished, upload-ready video. |
| `hook.mp4` | First 16s of the video (used for hook/virality analysis). |
| `thumbnail.png` | Matching 1280×720 thumbnail. |
| `footage/` | Real gameplay captured from this repo's game (headless Chromium + Playwright, keyboard-driven, 1280×720@30, silent). |
| `vo/` | Voiceover takes (Higgsfield seed_audio, "Skye" preset), one WAV per script block. |
| `assets/make-music.js` | Zero-dependency Node script that synthesizes the original chiptune bed ("Cartridge Horizon", 124 BPM). Deterministic — run it to regenerate `music.wav`. |
| `blocks.json` | The edit decision list: per block, which footage, which voice take, caption text, seek-in point, optional fast-forward `speed`, optional `holdExtra`. |
| `assemble.js` | The assembler. Trims/scales footage per block, burns chunked captions, pads each voice take into an exact block window, concatenates, and mixes the music bed (−20 dB, end fade). |
| `bridge.json` + `.github/workflows/media-bridge.yml` | A GitHub Actions "media bridge": the dev sandbox can't reach media CDNs directly, so an Actions runner fetches/uploads media listed in `bridge.json` on push. |

## Rebuild the video

```bash
node video-pipeline/assemble.js video-pipeline/blocks.json video-pipeline/final.mp4
```

Requires only `ffmpeg`/`ffprobe` and Node. Edit `blocks.json` to re-cut:
change `in` to pick a different moment of a clip, `speed` to fast-forward a
montage block, `text` to change captions. Voice-take duration always defines
block length, so cuts stay in sync with the narration automatically.

## Make the next video

1. Record fresh footage of the game (any screen recorder works; the original
   capture was headless Playwright driving the game with real key events at
   1280×720).
2. Write a 5–7 block script. One idea per block, ~10s of speech each,
   hook first.
3. Generate one voice take per block (any TTS; keep per-block files).
4. Update `blocks.json`, run `assemble.js`, done.
