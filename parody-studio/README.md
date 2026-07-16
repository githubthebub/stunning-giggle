# Parody Studio

A tiny, local, ffmpeg-powered comedy video editor. You point it at a video file
**on your own disk**, describe your edit in a small JSON file (cuts, speed
changes, punch-in zooms, meme captions, sound effects), and it renders an mp4.

- **Zero npm dependencies.** Node 22 + a system `ffmpeg`/`ffprobe` is all it needs.
- **Local files only.** It does not download anything, from YouTube or anywhere
  else, and it never will. Get your footage onto disk yourself, legally.
- **Original sound effects.** The SFX are synthesized from scratch by
  `make-sfx.js` — original sounds, not rips of anyone's audio.

---

## Fair use ground rules (read this first)

This tool is built for making **parody and commentary** edits. That only stays
on the right side of the line if you hold up your end. Plain-language ground
rules:

- **Short excerpts, not whole things.** Fair use favors using *only as much as
  the joke needs*. A few seconds to set up your bit: defensible. A full episode,
  a whole scene compilation, or an hour-long "edit" that's 95% someone else's
  footage: that's not parody, that's a reupload with extra steps.
- **Transformative or it doesn't count.** *Your* jokes, *your* commentary,
  *your* editing choices have to be the point of the video. If someone could
  watch your upload **instead of** the original and feel like they've seen it,
  you're substituting for the original — that's the fastest way to lose a fair
  use argument (and your channel).
- **Never be a substitute.** No full episodes. No "best scenes, uncut"
  compilations. No re-uploads with a caption slapped on. If the source footage
  is the product, you're not making parody, you're distributing someone else's
  work.
- **Your own footage is always the safe lane.** Stuff you filmed, stuff you
  licensed, stock you paid for, footage a collaborator gave you permission to
  use — with those, none of the above is even a question. When in doubt, shoot
  it yourself.
- **Parody targets the thing it uses.** Classic parody comments on *the source
  itself*. Using clip A just as pretty wallpaper for an unrelated joke is much
  weaker ground than making fun of clip A.
- **Fair use is a legal defense, not a permission slip.** It's decided
  case-by-case, by courts, after the fact. Nothing in this README is legal
  advice, and no tool can make an infringing video non-infringing. If real
  money or a real channel is on the line, ask an actual lawyer.

---

## Quick start

```bash
# 1. Generate the sound effects library (writes ./sfx/*.wav)
node parody-studio/make-sfx.js

# 2. No footage handy? Make a synthetic 12s test clip to play with:
ffmpeg -f lavfi -i "testsrc2=size=1280x720:rate=30:duration=12" \
       -f lavfi -i "sine=frequency=330:duration=12" \
       -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest \
       parody-studio/sample.mp4

# 3. Render the example project
node parody-studio/render.js parody-studio/example-project.json
# -> parody-studio/parody-out.mp4
```

## The project file

`render.js` takes one argument: a JSON project file. Relative paths inside it
resolve **relative to the project file's own directory**.

```jsonc
{
  "source": "./sample.mp4",       // local video file (required)
  "output": "./parody-out.mp4",   // where the mp4 goes (required)
  "width": 1280,                  // optional, defaults to source size
  "height": 720,                  // optional
  "clips": [                      // rendered in order, hard cuts between them
    {
      "start": 4,                 // seconds into the source
      "end": 7,                   // must be > start
      "speed": 1.5,               // optional, 0.25–4.0 (2 = twice as fast)
      "punchIn": 1.35,            // optional, 1.0–2.0 center zoom ("crash zoom")
      "mute": true,               // optional, drop the clip's own audio
      "caption": {                // optional bold, outlined meme text
        "text": "why is it doing that",
        "position": "bottom"      // "top" or "bottom"
      },
      "sfx": [                    // optional sound effects, mixed over the clip
        { "name": "deep-impact", "at": 1.0 },          // from ./sfx/
        { "file": "./my-laugh.wav", "at": 2.0, "gain": 1.5 }  // or any local audio
      ]
    }
  ]
}
```

Notes:

- `sfx[].at` is seconds from the clip's start **in the output**, i.e. after any
  `speed` change. An SFX that would run past the clip's end gets cut at the cut.
- `mute: true` still keeps SFX — great for "silent slow-mo + sad trombone".
- Captions use a bold font found under `/usr/share/fonts` at render time, drawn
  white with a black outline. Multi-line captions: put `\n` in the JSON string.
- Output is always h264 + aac, 30 fps, `+faststart` (streams instantly when
  uploaded).

## The sound effects

`node make-sfx.js` synthesizes eight original comedy sounds into `sfx/` as
44.1 kHz 16-bit WAVs:

| name                 | vibe                                          |
|----------------------|-----------------------------------------------|
| `boing`              | cartoon spring, pitch-bent sine with wobble   |
| `deep-impact`        | very low sub-bass thump, slow decay           |
| `record-scratch-ish` | filtered noise scratch, "wait, what?"         |
| `whoosh`             | band-swept noise transition                   |
| `sad-trombone-ish`   | four descending sliding saw notes, wah-wah    |
| `ding`               | bright FM bell, "idea!"                       |
| `dramatic-sting`     | minor chord stab with fast tremolo            |
| `airhorn-ish`        | detuned saw cluster ripping upward            |

All are generated from oscillators and noise — original audio you can use
freely in your videos.

## Optional web UI

```bash
node parody-studio/studio-server.js        # default port 3117
# open http://127.0.0.1:3117
```

A single form page: source/output paths, clip rows (start/end/speed/punch-in/
caption/mute), SFX dropdowns populated from `sfx/`, a JSON preview, and a
Render button that streams `render.js` progress into the page. The server
binds `127.0.0.1` only and serves local files only. Use absolute paths in the
UI (the browser has no idea what your working directory is).

## Requirements

- Node 22+ (no `npm install` — there is nothing to install)
- `ffmpeg` and `ffprobe` on your `PATH`
- At least one `.ttf`/`.otf` font under `/usr/share/fonts` (for captions)
