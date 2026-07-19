# 🌏 AURA ATLAS

*Five cities. Thirty-five choices. One massive vibe shift.*

A free, zero-dependency browser game about unlearning nice-guy brain: travel Mumbai → New York → London → Berlin → Tokyo, face 35 choose-your-path scenarios about money, ambition, wit, boundaries and inner game, and find out how much **aura** you can hold. Boss fight: the Aunty Gauntlet.

- **Play:** open `index.html` in any browser, or visit the GitHub Pages URL for this repo at `/aura-atlas/`
- **No build step, no server, no accounts, no AI, no ads.** Two static files.
- **Edit the content:** everything players read lives in [`content.js`](content.js) as plain text — scenarios, choices, aura values, field notes, the archetype quiz, the ending titles. Change text, refresh, done.
- **Launch & growth manual:** see [`PLAYBOOK.md`](PLAYBOOK.md).

## Structure

```
aura-atlas/
├── index.html   # engine + styles (screens, aura scoring, saves, share card)
├── content.js   # ALL game text — the only file you need to touch
├── PLAYBOOK.md  # the zero-cost launch playbook
└── README.md
```

Progress saves automatically to the player's browser (`localStorage`). The result screen generates a Wordle-style emoji card players can copy and share.

## Adding a city

Copy any city block in `content.js`, give it an `id`, `name`, `flag`, `tagline`, colors, an intro, and 7 scenarios (the 7th is the boss). The engine picks it up automatically — map, scoring, share card and all.

## Content principles

Every scenario passes three tests: the **wince test** (wrong choices are painfully recognizable), the **laugh test** (dry humor, never mugging), and the **teach test** (a real idea from a real thinker, honestly attributed — Sutherland, Housel, Naval, Sethi, Manson, Adler). Women are written as full humans. No pickup-artist content, ever — every lesson is about the player's own psychology.
