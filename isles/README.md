# 🏝 Shellfire Isles

An **original** GBA-style monster-taming RPG — you join the story late-game with six
badges already earned, heading into the **7th gym** — plus **Island Link**, an online
trade & battle hub your friends can join from any browser (think "open a website,
pick a team, battle live" — no install, no account, no AI needed on their side).

> Everything here is original work: all creature designs, names, stats, maps,
> dialogue, and pixel art (painted procedurally in code — there are zero image
> assets). It is a love letter to the genre, not a copy of any existing game.

## Quick start

```bash
cd isles
npm start          # → http://localhost:8420
```

No dependencies to install — the server is plain Node (18+).

- **`/`** — landing page
- **`/game.html`** — the single-player adventure (saves to your browser)
- **`/hub`** — Island Link, the multiplayer trade & battle hub

## The adventure

You start in **Cinderport** with **6 of 8 badges** and a ready team of six:

| Creature | Type | Field moves it knows |
|---|---|---|
| **Torrentoise** (your ace) | Water | **Surf**, **Waterfall** |
| Galehawk | Flying/Normal | **Fly** |
| Bramblade | Grass | **Cut** |
| Boulderox | Rock/Ground | **Strength**, **Rock Smash** |
| Voltlynx | Electric | **Flash** |
| Cinderfang | Fire/Dark | — |

All **seven field moves** work in the overworld: cut trees, fly between towns,
surf open water, shove boulders, light up the pitch-black Granite Hollow, smash
cracked rocks, and climb the Route 7 waterfall to a secret grove.

What's left to do: beat **Leader Pyra** (Fire, gym 7) in Cinderport, cross
Granite Hollow to Verdantia, beat **Leader Terra** (Ground, gym 8), then pass the
Victory Gate and take the **Champion** fight. Along the way: wild encounters in
tall grass / water / caves, catching with Capture Orbs, XP & level-ups, move
learning, a shop, creature storage, and 16 original species to find.

**Controls:** Arrows/WASD move · Enter/Z interact · Esc/X menu. Touch buttons
appear on phones. Progress autosaves to `localStorage`.

## Island Link (play with friends)

1. Start the server somewhere your friends can reach (see below).
2. Open **`/hub`**, pick a name and a room code — the page gives you a share link
   like `https://your-host/hub.html?room=TIDE42`.
3. Friends open that link in any browser. They don't need the game or a save —
   they can grab a **random rental team** and play immediately.
4. In a room you can:
   - **Battle** anyone live — the server referees turn-by-turn with the same
     engine as the adventure; teams are auto-leveled to 50 for fairness.
   - **Trade** creatures — pick, confirm on both sides, done. If you joined with
     your adventure team, the traded creature is written **into your adventure
     save**, so trades really matter.
   - **Chat** with the room.

### Hosting options

- **Same network:** `npm start`, then friends open `http://<your-LAN-IP>:8420/hub`.
- **Internet, zero config:** tunnel your local server with something like
  `npx localtunnel --port 8420` (or ngrok, Tailscale Funnel, Cloudflare Tunnel)
  and share the URL it prints.
- **Free hosting:** deploy the `isles/` folder to any Node host (Render,
  Railway, Fly.io, Glitch…). Start command `node server.js`; the server honors
  `PORT`. No database, no build step.

## Tech notes

- Zero-dependency Node server (`server.js`): static files + a small JSON/SSE API.
  Multiplayer uses Server-Sent Events + POST, so it works through almost any
  proxy or host without websocket support.
- The battle engine (`public/js/engine.js`) is shared verbatim between the
  browser (adventure) and the server (PvP refereeing) — one implementation of
  damage, stats, status, stages, switching, catching, and XP.
- All sprites/tiles are generated at runtime by `public/js/art.js`.

## File map

```
isles/
  server.js            # static hosting + rooms/battles/trades API (SSE)
  public/
    index.html         # landing page
    game.html          # adventure shell
    hub.html           # Island Link shell
    css/isles.css      # shared styles
    js/data.js         # types, moves, species, items, trainers' data
    js/engine.js       # battle engine (browser + server)
    js/art.js          # procedural pixel art (creatures, tiles, people)
    js/maps.js         # world maps, NPCs, encounters
    js/game.js         # overworld engine, menus, saves
    js/battle.js       # adventure battle UI
    js/hub.js          # multiplayer client
```
