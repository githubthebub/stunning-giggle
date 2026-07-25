# 05 — Legal Survival: Living Next Door to Nintendo

This is the strategy's load-bearing wall. Read it twice. The premise: Nintendo/
The Pokémon Company (TPC) *will not announce themselves*, precedent is entirely
one-directional, and nobody counter-sues Nintendo. We don't argue fair use;
we architect around enforcement reality.

## The risk ladder (from documented precedent)

| Rung | Activity | Precedent |
|---|---|---|
| 1 | **Videos about/showing a fan game** | Mostly tolerated at scale (Radical Red/Infinite Fusion coverage remains widespread and monetized, with no documented systematic wave against it) — but strike-able at will: PointCrow (Zelda mod videos, 2 strikes), ToastedShoes (Palworld-Pokémon mod video DMCA'd in hours), Pokémon FPS dev (videos themselves claimed), and **PokéNational Geographic — terminated in 2026 via successive strikes for 100% original Blender animation with no download at all.** |
| 2 | **Hosting/distributing the game or assets** | Pokémon Uranium (1.5M downloads → DMCA in 9 days), Pokémon Prism (C&D days before release), Pokémon Essentials (dev kit killed), **Relic Castle (killed for hosting LINKS, not files)**. This repo ships official artwork via PokéAPI = this rung. |
| 3 | **Popularity/press** | Ex-TPC Chief Legal Officer Don McGowan, on the record: press coverage is what puts a project on legal's desk — *"the worst thing on earth is when your 'fan' project gets press."* |
| 4 | **Monetization** | The documented engagement trigger: Nintendo's mass Game Jolt takedown cited ad revenue; McGowan said they'd wait to see if a Kickstarter funded, then engage. |
| 5 | **Merch/paid product** | Effectively guaranteed action. |

**What survives, and why:** Pokémon Showdown (no world/ROM, donation-averse,
15 years untouched), PokeMMO (never distributes Nintendo assets — users bring
their own ROMs), **Cobblemon (25M+ downloads, all original art, published
fair-use policy)**, Infinite Fusion (free, no crowdfunding, low press footprint).
The pattern is not "small stays safe" — it's **no official assets, no money,
no press.**

## Our posture, by rung

- **The channel films rung 1 only:** your physical cards + the app's UI +
  commentary. The full RPG is never the channel's face: a complete distributed
  Pokémon RPG is the exact object class with a 100% documented kill rate at
  scale, and "I rebuilt Pokémon in the browser" is the most press-magnetic
  headline in this niche. Don't make that video. Don't title it. Ever.
- **Rung 2 exposure is this repo itself** (PokéAPI official artwork). Accepted
  as a WHEN-not-IF: mitigation is the pivot pack + local caching + the
  audience banked off-platform. The app stays exactly as it is otherwise:
  free, open-source, no ads, no accounts.
- **Rung 3: never pitch press.** Not the app, not "the Pokédex Nintendo never
  made" as a headline. If press finds the *quest* (human story), fine; never
  aim it at the *software*.
- **Rung 4: the app takes no money in any form, forever.** No Patreon, no
  Kickstarter, no app-store listing, no donations. YouTube monetization
  attaches to the personality-and-physical-cards channel only.
- **Rung 5: no merch with any Nintendo mark, ever.** Dex-character merch
  (original IP) is fine *later*.

## Metadata hygiene

- Channel name/handle: **no "Pokémon", no "Pokédex."** (Even the obvious series
  name "The People's Pokédex" fails this test as a *channel* name; the fix:
  channel brand is yours, on-screen series title is **The People's Dex**.)
- "The Pokédex Nintendo never shipped" is spoken *inside* videos as commentary
  — never in titles, thumbnails, or descriptions where it reads as
  trademark-confusing packaging.
- Unaffiliated-fan-project disclaimer: app footer, repo, every description.
- Titles name the *cards* and the *quest*, not the software: "25¢ card, full
  ceremony" not "my Pokémon fan game." Nominative references to the cards
  ("Pokémon cards") in titles are fine; naming the app "Pokédex" in packaging
  is not — packaging calls it "the dex."

## The pre-built pivot (the escape hatch, built before the fire)

The Brick Bronze precedent is the playbook: DMCA'd on Roblox, the studio shipped
Loomian Legacy — original creatures — *over the same place ID* and kept the
audience. ToastedShoes re-shipped his mod with original creatures: untouched.
Palworld/Temtem/Cassette Beasts prove original designs put copyright out of
Nintendo's reach entirely (which is why the Palworld suit is patent-only — and
heading, per analysts, toward token damages and no injunction).

Ours, concretely:
1. The scanning/OCR/capture/ball engine is already independent of Pokémon data
   — the species list, art, and cries are data files. Build the **original
   creature pack** (the engine's procedural sprite generator already exists as
   fallback art — this is genuinely small work): original names, synth cries,
   original dex text.
2. **Foreshadow it in-lore** from Episode 2: the Dex glitches, sees things "the
   license doesn't cover." The pivot becomes anticipated story, not apology.
3. **Ship it as a milestone reward** (25k subs) while the Pokémon mode still
   lives — so the audience meets the original creatures *before* any takedown,
   and the season's second counter (career catches / Community Dex %) already
   runs on pivot-survivable units.
4. Cobblemon-style **published fair-use policy** for the original IP.

## When the letter comes (pre-scripted, decided while calm)

1. **Comply immediately and completely.** Takedown scope honored same-day; no
   counter-notification (nobody wins that against Nintendo); no lawyer-taunting.
2. **Do not read the letter on camera; do not name-and-shame.** The tone is
   gracious: fan first, always. ("No one likes suing fans" — make it easy for
   them to stop at one letter.)
3. **Publish the pre-written explainer** (drafted in Phase 0): what happened,
   what changes (the app's Pokémon mode), what doesn't (the channel, the cards,
   the quest, the Dex, the community, career-catch counters).
4. **Flip the switch:** original pack becomes the default; the glitch lore pays
   off; the Community Dex continues.
5. **The episode about it comes later, once resolved** — takedowns generate
   their own news cycle (Uranium, AM2R, Palworld mod); ride it with grace,
   not grievance. The story writes itself: *the people rebuilt it.*

Note the honest limit: **PokéNational proves even a fully-pivoted original
channel can still be strike-killed if TPC decides the *character content* is
close enough.** There is no perfect safety, only: audience off-platform,
original IP, no money on the app, no press, graciousness. That's the whole kit.

## COPPA / made-for-kids (the critic's catch — this can kill the machine silently)

A **made-for-kids** designation disables comments — which would destroy the
Entralink links, the submission queue, You-Commented-I-Coded, and the pinned
funnel in one stroke. The channel is therefore *genuinely* built for adults:
the 18–30 lapsed fan (your Starter Squad register already is) and parents.
Declare not-made-for-kids at channel level; keep the register adult-nostalgic;
flag honestly per-video anything unmistakably child-directed. Never chase kid
traffic with kid-coded packaging — it's the one audience win that unplugs the
whole engine.

## Content ID (separate from DMCA, hits every upload)

- **Official cries** (PokéAPI audio) in screen recordings are claimable audio.
  Phase 0 ships the synth-cries video mode; test one unlisted upload with real
  cries to learn the terrain.
- The game's own music is original WebAudio chiptune — safe.
- Never use official game OST or anime audio in edits. Obviously.

## Mail & minors (for later phases)

Physical card submissions wait until the channel is established; start with
photo submissions. When mail opens: PO box only, adults-submit-on-behalf
policy, no buy/sell/trade facilitation on-channel (that's a different
regulatory universe — and the *opposite* of the brand anyway).
