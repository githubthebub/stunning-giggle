# 🏝 Shellfire Isles

> **🎮 Play right now — no install, no account:**
> **https://curious-spark-605.higgsfield.gg/**
> Open it, send the invite link to a friend, and you're battling and trading in
> any browser. The solo adventure lives on the same site (linked at the top).

An **original** GBA-style monster-taming RPG — you join the story with six
badges, heading into the **7th gym** — plus the **Island Depot**, an online
meeting place with head-to-head battles and a real trading post.

> Everything is original work: all creature designs, names, stats, maps,
> dialogue, and pixel art (painted procedurally in code — zero image assets).
> A love letter to the genre, not a copy of any existing game.

## The Island Depot (multiplayer)

Rooms hold up to **8 trainers**. Share your room link — friends just open it.
Pick a name and a team: your **adventure save** (from the solo game on the same
site) or an instant **rental team**.

- **⚔ Battles** — challenge anyone in the room, *pick your lead creature*,
  then fight with simultaneous hidden move choices at flat level 50. Multiple
  battles can run in the same room; anyone can **spectate**. Forfeit and
  claim-win rules handle rage-quits.
- **📦 The Trade Depot** — the heart of the trading post, and fully
  *asynchronous*: list a creature with a **wish** ("any creature" or a specific
  species). Your listing stays on the shelf even while you're offline. Anyone
  can fulfill the wish with a matching creature — they receive yours instantly,
  and your side waits until you come back and hit **Collect**.
- **🌫 The Mist** — blind trades: offer a creature into the mist; when a
  stranger's offering drifts in, they swap sight-unseen.
- **🏆 Ranks** — per-room records: wins, losses, streaks and best streaks.
- **💬 Chat + emotes**, arrival announcements, and a recent-battles feed.
- **💾 Save sync** — if you joined with your adventure team, every trade,
  Depot deal and Mist swap is written back into your adventure save (the new
  arrival lands at 1 HP — take it to a Rest House).
- **🌐 Global room** — one well-known public room (the "global room" button)
  acts as a worldwide depot; private room codes are for friends.

Room state is persistent: deposits, records and chat survive everyone leaving.

## The solo adventure

You start in **Cinderport** with **6 of 8 badges** and a ready team of six:

| Creature | Type | Field moves |
|---|---|---|
| **Torrentoise** (ace) | Water | **Surf**, **Waterfall** |
| Galehawk | Flying/Normal | **Fly** |
| Bramblade | Grass | **Cut** |
| Boulderox | Rock/Ground | **Strength**, **Rock Smash** |
| Voltlynx | Electric | **Flash** |
| Cinderfang | Fire/Dark | — |

All seven field moves work in the overworld: cut trees, fly between towns,
surf, shove boulders, light up Granite Hollow, smash rocks, and climb the
Route 7 waterfall to a secret grove. Beat **Pyra** (Fire, gym 7), cross the
cave to **Verdantia**, beat **Terra** (Ground, gym 8), then take the
**Champion** fight. Wild encounters, catching, XP, move learning, a shop,
storage, and 16 original species along the way.

**Controls:** Arrows/WASD move · Enter/Z interact · Esc/X menu. Touch buttons
on phones. Autosaves to the browser.

## Run it yourself

```bash
cd isles
npm start        # builds the bundle and serves it on http://localhost:8420
```

Zero dependencies (Node 18+). The self-host kernel speaks the same protocol as
the hosted platform and runs the **same** rules module and client, with rooms
persisted to `isles/data/rooms.json`. Friends on your network open your LAN IP;
for the internet, use any Node host or a tunnel (`npx localtunnel --port 8420`).

## Architecture

```
isles/
  public/              the solo adventure + shared modules (source of truth)
    js/data.js         types, moves, 16 species, items, trainers
    js/engine.js       battle engine — same code referees solo AND multiplayer
    js/art.js          procedural pixel art (creatures, tiles, people)
    js/maps.js         world maps, NPCs, encounters
    js/game.js         overworld engine, menus, saves
    js/battle.js       adventure battle UI
  arena/
    arena-logic.js     multiplayer rules module (kernel contract: setup /
                       validateAction / applyAction / isGameOver / viewFor)
    arena-client.js    Island Depot client (WebSocket, full-state rendering)
    index.html         Depot page shell
    deploy-info.json   hosted deployment id + update procedure
  build-deploy.mjs     assembles dist-deploy/ (inlines data+engine into
                       logic.js, ships the adventure under assets/) + zip
  kernel-server.js     zero-dep self-host kernel: static files + RFC6455
                       WebSockets + room storage, same protocol as the platform
```

The multiplayer server logic is a pure, sandbox-safe state machine: every
action is validated server-side, hidden information (locked-in battle moves,
Mist offerings) is masked per-player in `viewFor`, and clients re-render
entirely from each full-state broadcast — no client-side trust anywhere.

### Updating the hosted deployment

```bash
node isles/build-deploy.mjs        # refresh isles/shellfire-isles.zip
git add -A && git commit && git push
# then deploy_game with the game_id from arena/deploy-info.json and
# source_game = the raw.githubusercontent.com URL of the zip on the branch
```
