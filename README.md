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
odds). Pokémon gain EXP, **level up, learn moves, and evolve** — Darumaka →
Darmanitan at Lv 35, the starters into their final forms, and more.

## ↔️ Entralink → Dream World (crossover)

Open the menu (Esc) → **Entralink** to step into the **Pokémon Dream World** —
the soft, dreamy companion experience:

- Send a Pokémon to sleep and explore the **Island of Dreams**, befriending
  Pokémon (each arrives with its **Hidden Ability**).
- Grow a berry **garden**, decorate a **house**, collect dream friends.
- **Cross over to another player who has it:** share a **Dream Link** code / URL
  so a friend can visit your dream and receive a gift Pokémon — or connect
  **live, peer-to-peer over WebRTC** (no server) to visit each other's dreams
  and trade in real time.

The Dream World is also playable on its own at **`/dreamworld.html`**.

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
```

Sweet dreams, Champion. 🌙
