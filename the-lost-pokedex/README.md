# The Lost Pokédex

A complete production kit for a Pokémon fanfic YouTube channel, built around one
serialized mystery: a Pokédex registered to **Trainer ID 000** — an ID the League
says was never issued — found in the storage unit of Professor Oak's
decommissioned lab. Each episode "restores" one corrupted entry. Each entry tells
the story the official Pokédex got wrong. And each restoration un-corrupts one
more piece of the trainer's ID photo.

151 entries. One photo. One question the whole comment section fights over:
**whose Pokédex is this?**

## Why this format is built to go viral

- **Serialized open loops.** The frozen clock, the 14-minute power window, the
  un-corrupting photo — every episode closes one loop and opens two. Viewers
  subscribe to *find out*, not because a voiceover asked them to.
- **Wholesome-dark tone.** Creepypasta hooks people in; emotional payoffs make
  them share. Every entry is a gut-punch that resolves warm. That combination
  outperforms pure horror in this niche.
- **Comment-section fuel.** Every video ends on a theory question ("wrong
  answers only"). Comments drive the algorithm harder than likes.
- **Shorts funnel.** Each long-form entry compresses into a sub-60-second short
  that ends exactly where the long-form gets good.
- **Format is infinitely extensible.** 151 entries in Season 1 alone, and the
  frame (found device, restored files) survives cast changes, region changes,
  and spin-offs.

## What's in this kit

| Path | What it is |
| --- | --- |
| `series-bible.md` | Premise, narrator, canon rules, full Season 1 episode map with cliffhangers |
| `scripts/episode-01-entry-zero.md` | Complete flagship script (~10 min) with timestamps, retention beats, and visual directions |
| `scripts/shorts/` | Three sub-60-second Shorts scripts that funnel into the long-form |
| `production/titles-and-thumbnails.md` | A/B title pairs and thumbnail concepts, with the reasoning |
| `production/upload-checklist.md` | Description template, tags, pinned comments, cadence, and the Shorts→long-form funnel |

## Making this its own repository

This folder is fully self-contained. To promote it to a standalone repo:

1. Create an empty repository on GitHub (e.g. `the-lost-pokedex`) — no README,
   no license, so the first push is clean.
2. From a clone of this repo, on this branch:

   ```bash
   cp -r the-lost-pokedex ~/the-lost-pokedex && cd ~/the-lost-pokedex
   git init -b main && git add -A && git commit -m "Initial commit: The Lost Pokédex channel kit"
   git remote add origin git@github.com:githubthebub/the-lost-pokedex.git
   git push -u origin main
   ```

## Disclaimer

Pokémon © Nintendo / Creatures Inc. / GAME FREAK inc. This is unofficial,
non-commercial fan fiction. It is not affiliated with, sponsored by, or endorsed
by the rights holders. Every video description in this kit carries the same
notice.
