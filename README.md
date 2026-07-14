# 🌙 Pokémon Dream World

A love-letter to the **Pokémon Black & White Dream World** — a soft, dreamy web
game where you send a Pokémon to sleep, wander the **Island of Dreams**,
befriend sleeping Pokémon (each with a rare **Hidden Ability**), grow a berry
garden, decorate your house… and **cross over into another player's dream** to
trade Pokémon.

No build step, no dependencies, no accounts. Just open it and dream.

![Island of Dreams](docs/island.png)

## ▶️ Run it

```bash
npm start        # serves on http://127.0.0.1:4173
# or: node server.js
```

Then open the printed URL. (The bundled server is a ~60-line zero-dependency
static file server — Node is the only requirement.)

Your progress saves automatically to your browser's `localStorage`.

## ✨ What you can do

| Tab | What it is |
| --- | --- |
| **💤 Dream** | Send your partner to sleep and explore six dream areas — Pleasant Forest, Windswept Sky, Sparkling Sea, Rugged Mountain, Spooky Manor, Pretty Meadow. Tap a sleeping Pokémon to play the **Dream Meter** befriending minigame. |
| **📦 Box** | Every Pokémon you've befriended, each carrying its **Hidden Ability**. Nickname them, release them, or set one as your **crossover gift**. |
| **🌱 Garden** | Plant berries, let them grow while you dream, and harvest them for Dream Points. |
| **🏠 House** | Buy furniture with Dream Points and decorate a room that visitors see when they cross over. |
| **↔️ Crossover** | Visit another player's Dream World and trade Pokémon — see below. |
| **🧑 Profile** | Your trainer identity, sleeping partner, and dream stats. |

## ↔️ Crossover — "cross over to the other person who has it"

The headline feature. Two ways to connect with anyone else who has the game:

### 🔗 Dream Link (offline, async)
Your whole Dream World (trainer, house, befriended Pokémon and a gift you set)
is encoded into a compact `DW1.…` code and a shareable **visit link**.

- **Share** your code/link with a friend.
- **Paste** a friend's code (or open their link) to step into their dream: you
  see their house, their dream friends, and can **accept the gift** they left —
  it crosses over into your Box with its Hidden Ability and an "↔ from *Trainer*"
  origin tag.
- Opening a `#visit=…` link auto-opens their dream.

### 📡 Live Crossover (real-time, serverless)
A direct **peer-to-peer WebRTC** link — no server involved. One player invites,
the other joins, and you swap two short connection codes. Once connected you
can **visit each other's dreams live** and **send Pokémon across in real time**.

## 🎨 Notes & niceties

- **Sprites:** shows a cute procedural "dream blob" for every species instantly,
  then transparently upgrades to official Pokémon artwork if the network allows —
  so it looks good online *and* offline.
- **Hidden Abilities:** the whole point of the real Dream World — every befriended
  Pokémon arrives with the ability it could only get from dreaming.
- **Sound:** a tiny WebAudio blip synth (no audio files). Everything is generated.
- **Shinies:** ~2% of befriended Pokémon sparkle. ✦
- Works great on mobile; the nav collapses to icons on small screens.

## 🗂️ Project layout

```
index.html          # loads everything, in dependency order
styles.css          # the dreamy pastel UI
server.js           # zero-dependency static server
js/
  data.js           # species roster, areas, berries, furniture
  sprites.js        # procedural sprite generator + official-art upgrade
  state.js          # game state + localStorage persistence
  ui.js             # DOM helpers, toasts, modals, cards
  audio.js          # WebAudio blip synth
  minigame.js       # the Dream Meter befriending game
  dreamworld.js     # sleep flow, Island of Dreams, encounters
  garden.js         # berry growing
  house.js          # furniture + decoration
  box.js            # collection, nicknames, gifts
  crossover.js      # Dream Link codes + live WebRTC crossover
  main.js           # app shell, onboarding, navigation, profile
```

Sweet dreams! 🌙
