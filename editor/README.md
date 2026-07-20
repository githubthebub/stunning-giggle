# 🎬 FeatherCut — the featherweight video editor

A Premiere-style video editor that runs **entirely in your browser tab**.
Nothing to install, no account, no upload — and it's deliberately designed to
take (almost) **no storage and no idle RAM** from your laptop.

## ▶️ Open it

**Play it right from the repo — nothing to clone or install:**

### 👉 https://githubthebub.github.io/stunning-giggle/editor/

That's the live GitHub Pages copy. It's served over HTTPS (which the export
feature needs), works on desktop Chrome / Edge / Firefox, and — like the local
copy — never uploads your footage anywhere.

Prefer to run it yourself?

```bash
npm start        # then open http://127.0.0.1:4173/editor/
```

…or just open `editor/index.html` straight in a browser — it's a single
self-contained file with zero dependencies.

> **Maintainer note:** the live link works once GitHub Pages is enabled for the
> repo — in **Settings → Pages**, set **Source** to **GitHub Actions** (a
> one-time click; the token can't enable Pages on its own). The included
> workflow then publishes the whole site, including `/editor/`, on every push.

## Why it doesn't eat your laptop

| | Desktop editor (e.g. Premiere Pro) | FeatherCut |
| --- | --- | --- |
| Install size | ~4 GB + cache folders | **0 bytes** (one web page) |
| Media handling | Copies/creates preview files | **Links files from disk — never copies** |
| RAM when closed | Background services | **0 — close the tab, it's gone** |
| Export | Renders into RAM/scratch disk | **Streams straight to your chosen file** |

- **Imports are links, not copies.** Files are referenced via object URLs; the
  browser streams small chunks from disk as needed.
- **Exports stream to disk.** In Chrome/Edge the recording is written to the
  destination file as it renders, so long exports don't pile up in memory.
- **Private by design.** There is no server-side anything; footage never leaves
  your machine.

## What it can do

- Multi-clip timeline: trim by dragging edges, ✂ split at the playhead,
  drag to reorder, delete — with **undo/redo** (`Ctrl+Z` / `Ctrl+Shift+Z`)
- **Cross-fade transitions** between clips, plus per-clip fade in/out to black
- Per-clip **speed** (0.25×–4×), **volume**, and **Fill frame** (crop vs letterbox)
- One-click **Looks** (Warm / Cool / Vintage / Noir / Punch) plus manual
  brightness / contrast / saturation / black-&-white
- 🔤 **Title overlays** (size, color, position, bold, outline, fade in/out)
- 🎵 **Music track** with start offset, volume, fade in, fade out at the end,
  and loop-to-fit
- Photos as clips (set any duration); playhead snaps to cuts while scrubbing
- Export to **MP4** (in browsers that support recording it — plays everywhere,
  including iPhones) or **WebM**, at 720p / 1080p / vertical 1080×1920,
  30 or 60 fps
- Keyboard: `Space` play · `S` split · `Delete` remove · `Ctrl+Z` undo ·
  `←/→` step · `Home/End`

> Export runs in real time (a 2-minute edit takes 2 minutes) and needs
> Chrome, Edge or Firefox. If the MP4 option doesn't appear, your browser
> can't record MP4 — the WebM it makes instead still uploads fine to
> YouTube/Drive.

## If you truly need Adobe Premiere Pro itself

No app can run Premiere locally without using your laptop's disk and RAM — but
you can rent someone else's computer and stream it:

- **Cloud PCs** (e.g. Shadow PC, Paperspace): Premiere runs on a machine in a
  datacenter; your laptop only streams the screen. Storage/RAM used: ~none.
- **Free browser editors** with more horsepower behind them: CapCut Web,
  Canva Video, Clipchamp — same "nothing installed" idea as FeatherCut, with
  bigger feature sets (but accounts, uploads, and watermark rules).

FeatherCut is the zero-cost, zero-signup, zero-storage corner of that space.
