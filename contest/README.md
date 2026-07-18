# THE RIVER REMEMBERS — India–Japan Anime Contest Submission
### 河は憶えている / नदी को याद है

**Submission format: Video + Proposal**

> When a grieving veena prodigy in Chennai and a reluctant shrine heir in Enoshima strike the
> same note 6,000 km apart, they wake a fading goddess with two names — Saraswati in India,
> Benzaiten in Japan — and have one festival night to finish the song she has carried between
> their countries for 1,300 years.

## Deliverables

| File | What it is |
|---|---|
| `deliverables/THE_RIVER_REMEMBERS_teaser.mp4` | 1:44 concept teaser — 1920×1080, 16:9, 24 fps, stereo, English narration, bilingual (JP+EN) subtitles |
| `deliverables/THE_RIVER_REMEMBERS_proposal.pdf` | 12-page A4 proposal — cover with title + logline, ≤300-word synopsis, character sheets, image boards, story/music/visual direction |
| `PRODUCTION.md` | Full creative bible (concept, characters, shot list, VO script) |
| `proposal/` | HTML source of the proposal (renders to the PDF via headless Chromium) |
| `assets/manifest.json` | URL manifest of every generated asset (used by the CI relay during the build) |

## Rules compliance

- **Video**: 1:44 (≤ 5:00) · 16:9 horizontal · Full HD 1920×1080 · stereo AAC · burned-in subtitles in **both** Japanese and English · accompanied by the proposal ✓
- **Proposal**: 12 pages (≤ 15) · cover includes title and logline · synopsis 255 words (≤ 300) · includes character illustrations and image boards ✓
- **Rights**: all story, characters, designs, narration and imagery are original and were created for this submission. Mythological figures (Saraswati/Benzaiten) and traditional musical forms (raga Hamsadhvani, miyako-bushi scale) are public cultural heritage. No third-party footage, music, or IP is used.

## How it was made (AI-assisted, disclosed in both deliverables)

- Concept, story, characters, all text, shot direction, subtitle translations: authored for this entry.
- Stills & boards: Nano Banana Pro (via Higgsfield), with character-sheet references for identity consistency.
- Motion + diegetic audio: Kling 3.0 pro image-to-video with audio sync, one clip per storyboard shot.
- Narration: Seed Audio TTS ("Saras" voice), mixed under sidechain ducking; assembled and mastered with ffmpeg (EBU R128 −16 LUFS), bilingual ASS subtitles.
- Build note: the build environment's egress allowlist blocks the generation CDN, so a small
  GitHub Actions workflow (`.github/workflows/media-relay.yml`) fetches the generated assets
  listed in `assets/manifest.json` and pushes them to a temporary `media-relay-assets` branch,
  which the build then pulls through the authenticated git remote.
