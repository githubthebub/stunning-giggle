# 04 — The 90-Day Plan

## Phase 0 — Pre-launch (2 weeks). Do not skip a single item.

**Prove the trick works on camera** (the completeness critic's #1 flag — every
flagship assumes a live, unstaged demo):
- [ ] Film 20 test scans on the actual phone in actual lighting: pristine cards,
  bent cards, fakes, foils (glare is OCR's enemy), sleeves on/off. Log the real
  hit rate. If foils/damage misread badly, that's not a blocker — misreads are
  content ("did you mean Chorizard?") — but you must *know* the rate before
  promising ceremonies.
- [ ] Deploy to GitHub Pages (Settings → Pages → GitHub Actions — the workflow
  already ships in this repo) so the camera works over HTTPS on your phone and
  any viewer's.
- [ ] Price-check bulk lots locally (the season budget assumes ~$20–30 per 1,000
  cards — verify before Episode 1 scripts it).

**Product tweaks that serve the show** (small engineering, big filmability):
- [ ] **Video-safe audio mode:** a toggle that swaps official Pokémon cries for
  the built-in WebAudio chiptune synth in exports/streams — official cries are
  Content ID bait on every single short. Test one unlisted upload with cries ON
  to learn whether they claim it; default to synth in published videos.
- [ ] **HUD overlays in-app:** `Registered: x/1025`, career catches, and a
  manually-set `Dex fund: $xx.xx` — so every screen recording carries the
  season scoreboard with zero editing.
- [ ] **Cache PokéAPI assets locally** as you scan (the API is a single point of
  failure that redistributes the exact asset class Nintendo has DMCA'd before;
  a dead API must not kill the show mid-season).
- [ ] **Original-creature pack: skeleton now.** Even 10 placeholder creatures
  with procedural sprites (the engine already has procedural fallback art!)
  proves the hot-swap works. Ship-ready is a month-6 problem; *existing* is a
  week-2 requirement.
- [ ] Unaffiliated-fan-project disclaimer in app footer, repo README, and every
  video description.

**Channel plumbing:**
- [ ] Channel name/handle contains no Nintendo trademark ("Pokédex"/"Pokémon").
  Series title on-screen: *The People's Dex*.
- [ ] Audience declared **not made for kids** (channel-level), and keep the
  register adult-nostalgic (your Starter Squad tone already is). A made-for-kids
  designation kills comments — and comments are the Entralink, the submission
  queue, and the You-Commented-I-Coded engine. Individual videos that are
  unmistakably child-directed must be flagged per-video honestly; the *channel*
  is for the 18–30 lapsed fan and for parents.
- [ ] Discord server + email list live before video 1 (the audience is the only
  asset that can't be DMCA'd). Every description links both.
- [ ] **Pre-bank 10 evergreen shorts** (Shiny Lottery days, Fake Card Court
  cases, Quarter-Machine ceremonies). This is streak insurance: illness must
  never break the format.
- [ ] Write the C&D response post *now*, calm and pre-agreed
  ([05-legal-survival.md](05-legal-survival.md)) — decisions made under
  adrenaline are how channels die.

## Phase 1 — Launch (weeks 3–6): "the magic trick weeks"

- **Cadence:** 1–2 shorts/day (from the pre-bank + one batch scan-session per
  week), long-form Episode 1 in week 3, then weekly.
- **Order:** Flagship short ("washing machine Charizard") → Fake Card Court
  Case #1 ("the $3 'Pikachu Illustrator' from Wish") → Episode 1 → daily rotation
  across all eight formats to find what *your* audience feeds on.
- **Community seeding (allowed):** your own old subscriber base, Starter Squad
  fan spaces, r/PokemonTCG's budget/vintage threads, Discords — as a fan sharing
  a free toy, never as press outreach.
- **Register:** small-audience self-awareness as a running bit ("all twelve of
  you"). It's charming at 200 views and a founding-myth callback at 200k.
- **Story beats land here too:** the Dex character introduced fully by video 3;
  the glitch lore planted in Episode 2 (weeks 3–4).

## Phase 2 — Iterate (weeks 7–12)

- Kill or double formats based on **viewed-vs-swiped** (target ≥75%) and
  APV (target ≥70%, loops >100%); check "viewers who watched a long video
  after a Short" in analytics weekly.
- Start Binder Resurrection with *digital* submissions (photos — no mail
  logistics yet).
- **Week 8:** LP/Ripit references demoted to pinned comments.
  **Week 12: gone entirely.** The formats must stand alone by then.
- First milestone unlock (2,500 subs → shiny-odds display) announced when the
  trajectory supports it.

## KPIs (directional, honest)

| Metric | Target | Reality check |
|---|---|---|
| Viewed vs. swiped | ≥75% | Below ~60% = the hook is failing; change frame 1, not the format |
| APV | ≥70%; loops >100% | The loop-into-hook edit is the single highest-leverage 2 seconds of work |
| Shorts→sub conversion | 0.05–0.5% is *normal* | A 1M-view short may yield only ~500–5,000 subs — don't read that as failure; the long-form funnel is where subs happen |
| Cadence | 12+ uploads/month minimum | Batching, not heroism |
| 1k→100k timeline | 9–24 months reported range (unaudited) | Anyone promising faster is selling something |

## Decision gates

- **Day 45:** if nothing has cracked 10k views — the formats are fine, the hooks
  aren't. Re-shoot frame-ones only (the wound closer, the sticker bigger, the
  verdict withheld longer). Do not add new formats; sharpen the eight.
- **Day 90:** at least one short >100k views and steady sub growth → hold course,
  scale batch production. Flat everything → the Speedrun-the-Engine pillar
  becomes the A-test (dev audiences convert differently) while ceremonies
  continue as the identity.
- **Any day, C&D arrives:** execute [05-legal-survival.md](05-legal-survival.md)
  §"When the letter comes." It is a plot beat, not a funeral — but only because
  you prepared in Phase 0.

## The money conversation (had once, honestly)

Gaming Shorts RPM is the platform's worst ($0.02–$0.08/1k); Shorts-feed time
doesn't count toward the 4,000 watch-hours; the app must stay revenue-zero
(legal shield + positioning). Therefore:

- **Months 1–12 income: assume ~zero.** This campaign pays in audience and
  career optionality (the AM2R precedent: fan-project → industry career).
- Long-form gaming RPM ($2–6) becomes real once the funnel works — that's the
  monetization, alongside (later, ethos-compatible only): channel memberships,
  binder/sleeve/storage sponsors, LGS partnerships. **Never**: card-market
  affiliate links, break promos, anything that smells like the thing the channel
  exists to be the opposite of.
- The finale giveaway costs nothing beyond cards the season already bought —
  and is worth more than any sponsor.
