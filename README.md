# 🔴 Pokémon Unova — Dream Journey

A Pokémon **Black & White-style RPG** you play in the browser — walk the
overworld, battle and catch Pokémon, earn badges, master every HM, and beat the
**Elite Four & Champion**. Then step through the **Entralink** into a fully
shareable **Dream World** where you can **cross over** into another player's
dream and trade Pokémon.

No build step, no dependencies, no accounts. Runs on plain Node + a browser.

![Overworld](docs/island.png)

## ▶️ Run it

```bash
npm start        # serves on http://127.0.0.1:4173
# or: node server.js
```

Open the printed URL. Progress saves automatically to your browser.

- **RPG:** `http://127.0.0.1:4173/`
- **Card Dex** (scan your real trading cards): `http://127.0.0.1:4173/pokedex/`
- **🎬 FeatherCut video editor** (zero-install, zero-storage — see
  [`editor/README.md`](editor/README.md)): `http://127.0.0.1:4173/editor/`

### 🌐 Play in the browser (no install)

The whole thing is **live on GitHub Pages** over HTTPS — no clone, no `npm`
(a workflow republishes the `gh-pages` branch on every push):

- **Game:** https://githubthebub.github.io/stunning-giggle/
- **Card Dex:** https://githubthebub.github.io/stunning-giggle/pokedex/
- **🎬 Video editor:** https://githubthebub.github.io/stunning-giggle/editor/

- **Move:** Arrow keys / WASD  ·  **Interact / Confirm:** Z / Space / Enter  ·
  **Cancel:** X  ·  **Menu:** Esc  ·  on-screen touch controls on mobile.

## 🎮 Two ways to start

On the title screen:

- **✦ New Adventure** — the full journey. Get a starter from Prof. Juniper and
  work your way north through Unova, earning badges and HMs, to the League.
- **👑 Continue as Champion** — jump straight to the post-game with **all four
  badges, all five HMs, and a team led by Darmanitan** (Lv 55) — free to roam
  and use the Entralink immediately. (Exactly the "beaten E4 + Darmanitan +
  every HM" state.)

## 🗺️ The journey (New Adventure)

Home town → Route 1 → **Striaton** (Gym 1 → **Cut**) → **Desert Resort**
(catch **Darumaka**, which evolves into **Darmanitan**!) → **Nacrene**
(Gym 2 → **Strength**, and an NPC who gives you **Fly**) → Route 3 (roll away
boulders with Strength) → **Castelia** (Gym 3 → **Surf**) → the **Sea**
(Route 4, Surf across) → **Opelucid** (Gym 4 → **Waterfall**) → surf & climb the
falls into **Victory Road** → the **Pokémon League**: **Shauntal, Grimsley,
Caitlin, Marshal**, and **Champion Alder**.

Every HM has a real field use gating your progress:

| HM | Use in the world |
| --- | --- |
| **Cut** | Fell the slim trees blocking the desert. |
| **Strength** | Roll away boulders on Route 3. |
| **Surf** | Cross the sea on Route 4 (and Victory Road's water). |
| **Waterfall** | Climb the falls to reach Victory Road. |
| **Fly** | Fast-travel to any city you've visited (menu → Fly). |

## ⚔️ Battle system

A real turn-based engine: the full **17-type** chart, **STAB**, critical hits,
**status** (burn / poison / badly-poisoned / paralysis / sleep / freeze),
**stat stages**, PP, priority moves, multi-hit, recoil & drain, switching,
items, and **catching** with Poké/Great/Ultra Balls (status & HP affect the
odds). **Abilities matter** — Intimidate drops Attack on entry, Levitate dodges
Ground, Sturdy survives a OHKO, Blaze/Overgrow/Torrent/Swarm power up in a
pinch, Guts turns status into muscle, Shed Skin shrugs off ailments. Pokémon
gain EXP, **level up, learn moves** (with a forget-a-move prompt when their set
is full), **and evolve** — Darumaka → Darmanitan at Lv 35, the starters into
their final forms, and more.

**Trainers spot you** the moment you cross their line of sight, the **Elite
Four and Champion take rematches**, and battles open with a classic encounter
flash, floating damage numbers, and a green tint for shinies.

### Quality of life
Hold **X** to run · a **PC Box** to store and swap Pokémon · a **Sound** toggle
in the menu · everything saves automatically.

## ↔️ The Entralink (1:1 with Black & White — available from the start)

Open the menu (Esc) → **Entralink** and you are *pulled into the Entralink
itself* — the mystical realm at the heart of Unova, exactly like the C-Gear
trip in the original. It works from the very first minute of a new game.

Inside the Entralink map:

- **The glowing Entree tree** — interact for **Game Sync**: tuck in a Pokémon
  and enter the **Dream World** (Island of Dreams, berry garden, dream house).
- **The Entree Forest** (north) — Pokémon you befriend in the Dream World
  physically wake up here, dozing under the trees. Battle them and, just like
  the real Entree Forest, **a Poké Ball never fails** — they join your party
  keeping their **Dream World Hidden Ability**.
- **The white bridges** (east/west) — **play with a friend, no server needed.**
  Cross a bridge to:
  - **⚔ Battle a friend's team** — they hand you a battle code (or a
    `…#battle=` link); you fight their *actual* team. Send yours back for a
    rematch.
  - **🎁 Send / 📥 receive a Pokémon** — export one of your Pokémon to a code /
    link; a friend opens it and it joins their game with its moves & Ability.
  - **🌙 Visit dreams** — the Dream World crossover (share your dream, gift a
    Pokémon).

  Because it's all encoded into text, it works anywhere — paste a code, or open
  a link like `<game-url>#battle=UNOVA-B1…`. No accounts, no server.
- **The warp pads** — return exactly where you were standing in Unova.

### Playing with a friend (how the codes work)
Open the Entralink → walk onto a white bridge → **Show my battle link**. Copy
the code or the link and send it to a friend. When they open it (or paste the
code into their own bridge menu), they battle your team. Gifts work the same
way with a Pokémon code. It's asynchronous — a snapshot you can re-share
anytime — not a live connection, so there's nothing to host.

The full BW pipeline works end-to-end: befriend in the Dream World → it leaves
the Dream World and waits in the Entree Forest → guaranteed catch → it's in
your game with its Hidden Ability.

The Dream World is also playable on its own at **`/dreamworld.html`**.

## 📇 Card Dex — scan your real Pokémon cards

Open **`/pokedex/`** and hold a real Pokémon trading card up to your camera —
the Card Dex reads the card's name right in your browser (Tesseract.js OCR,
no server, no API key), looks the Pokémon up on [PokéAPI](https://pokeapi.co),
and shows a full Pokédex entry: official artwork, types, dex flavor text,
base stats, height/weight, even its cry. Then **throw a ball** and try to
catch it into your collection — saved in your browser, with catch dates and
duplicate counts, working toward all **1025** species.

### 🌐 Play it anywhere

**Live now:** the site is published on GitHub Pages —
**[githubthebub.github.io/stunning-giggle/pokedex/](https://githubthebub.github.io/stunning-giggle/pokedex/)**
(the RPG lives at the site root). A GitHub Actions workflow republishes it on
every push to the default branch by updating the `gh-pages` branch — no
settings or tokens needed (the repo just has to be public). Pages serves over
**HTTPS, so the camera works on your phone** — no local server needed. The Card Dex is also a **PWA**: open it on your phone,
"Add to Home Screen", and it launches full-screen like a real Pokédex, with
the app shell, sprites, and OCR engine cached for instant repeat scans.

### 🎮 Catching is a real game

- Every species uses its **real capture rate** from the games — a Caterpie
  is nearly a sure thing, Mewtwo will fight the ball.
- Throws run classic **shake checks**: the ball drops, wobbles up to three
  times… and can **burst open**. Each escape raises your odds a little
  (a pity ramp), so nothing is unwinnable.
- **Ball tiers unlock as your career catch count grows**: Poké Ball from the
  start, Great Ball at 10, Ultra Ball at 25, and the never-miss Master Ball
  at 60. Live catch odds are shown on every ball.
- **✨ Shinies!** Every wild encounter has a 1/64 shiny chance — shiny
  artwork, a golden banner, and a permanent sparkle in your dex.
- Chiptune-style **sound effects** (WebAudio, no assets) and confetti for
  new registrations.

### 🔍 Four ways in

- **📷 Scan** — live camera with a card-shaped guide (needs `localhost` or
  HTTPS for camera access), plus a 🔦 flashlight toggle on phones that
  support it. The scanner reads the name strip first, then the whole card,
  and fuzzy-matches against every species — misreads like "Chorizard",
  glued suffixes like "Charizardex", split names like "Mr. / Mime", and the
  "Evolves from …" trap are all handled.
- **🖼 Photo** — no camera? Scan a photo of the card instead (on phones this
  opens the camera app).
- **🔎 Search** — or just type a name with autocomplete.
- **📕 Pokédex** — your caught collection: progress bar, sprite grid,
  ×N duplicate badges, shiny sparkles, first-caught dates, and Release.

If a scan is ambiguous you get "did you mean?" chips instead of a wrong catch.

## 🎨 Notes

- **Sprites:** cute procedural monster art renders instantly, then transparently
  upgrades to official Pokémon artwork when the network allows — so it looks
  good online *and* offline.
- **Sound:** a tiny WebAudio synth for SFX and looping chiptune music. No assets.
- Works on desktop and mobile (touch d-pad + A/B/Menu).

## 🗂️ Project layout

```
index.html          # the RPG
dreamworld.html     # the Dream World (also opened by the Entralink)
server.js           # zero-dependency static server
game.css            # RPG styling
styles.css          # Dream World styling
game/               # the RPG
  data.js           # types, moves, species (stats/learnsets/evolutions), items
  party.js          # Pokémon instances, stats, XP/leveling, evolution, save-state
  battle.js         # turn-based battle engine (event stream)
  tiles.js          # tile terrain + procedural drawing
  sprites.js        # battle sprites (+ procedural fallback) & overworld characters
  maps.js           # the world: 11 maps, warps, NPCs, gyms, E4, encounters
  audio.js          # SFX + chiptune music
  gameui.js         # dialogue, menus, transitions
  save.js           # persistence + New Adventure / Champion presets
  input.js          # keyboard + touch input
  world.js          # overworld scene: movement, HMs, encounters, interaction
  battlescene.js    # battle UI + event playback
  menu.js           # party / bag / shop / fly / trainer card
  entralink.js      # the portal into the Dream World
  main.js           # boot, title, scene manager, game loop
js/                 # the Dream World (data, sprites, minigame, garden, crossover, …)
pokedex/            # Card Dex — point your camera at a real card, catch it
  index.html        # the Pokédex device UI
  pokedex.css       # red-shell Pokédex styling
  manifest.webmanifest, sw.js, icon.svg   # PWA: installable + offline cache
  js/scanner.js     # camera, torch, frame capture, preprocessing, Tesseract OCR
  js/matcher.js     # OCR noise → species name fuzzy matching
  js/game.js        # catch mechanics: capture rates, shake checks, balls, shinies
  js/sfx.js         # WebAudio chiptune sound effects
  js/api.js         # PokéAPI client (species list, entries)
  js/storage.js     # the caught collection (localStorage)
  js/app.js         # scan / entry / throw / collection UI
.github/workflows/  # deploy-pages.yml — publishes the site to GitHub Pages
```

Sweet dreams, Champion. 🌙
