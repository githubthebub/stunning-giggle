# COMPOUND — Learn Fast. Be Heard.

**A single, self-contained web page that turns the best of learning science and
attention research into tools you can actually use.** No build step, no
dependencies, no accounts, no server, no tracking — open the file and it runs.

> Two forces decide whether an idea sticks: how your **brain** stores it, and how
> the **world** spreads it. COMPOUND distills both — the cognitive science of
> memory (Ebbinghaus, Roediger & Karpicke, Bjork, Ericsson — the work that shows
> up in Harvard and Stanford learning-science courses) and the attention
> mechanics the most-watched creators on Earth obsess over — into one interactive
> page.

## ▶️ Run it

It's one file. Any of these work:

```bash
# Just open it
open index.html            # macOS   (xdg-open on Linux)

# …or serve it, if your browser is strict about file:// URLs
python3 -m http.server 8000   # then visit http://localhost:8000
```

That's the entire setup. Everything — styles, logic, the spaced-repetition
engine, the charts — is inlined in `index.html`.

## What's inside

| Section | What it does |
|---|---|
| **Retention Lab** | An interactive forgetting-curve simulator. Drag *review frequency* and *recall effort* and watch a memory fight exponential decay in real time. Shows *why* a handful of well-timed reviews beats one long study session — and that harder recall means **fewer** reviews needed. |
| **The Learning OS** | Five evidence-based techniques — active recall, spaced repetition, interleaving, the Feynman technique, deliberate practice — each written as a protocol you can run this week, with its source. Plus the two popular methods that *don't* work well. |
| **The Attention Engine** | A live audience-retention graph — the single chart top creators optimize obsessively — with toggles for the hook, curiosity gaps, escalation, and pacing. Plus the principles behind each, framed honestly as tools for making *true, useful* things travel further. |
| **Flashcards** | A **real spaced-repetition system** running the **SM-2 algorithm** (the math behind SuperMemo and Anki), pre-loaded with the key ideas from the page. Grade your recall and it schedules the next review. Progress is saved privately in your browser via `localStorage`. |
| **Mental Models** | Six reusable thinking tools — inversion, first-principles, opportunity cost, second-order thinking, expected value, Occam's razor — for using knowledge under uncertainty. |

## How the interactive parts actually work

- **The forgetting curve** is modeled as retention `R = e^(−t/S)`, where the
  memory's *stability* `S` grows every time you successfully recall it. Reviews
  fire at expanding intervals (recall when retention decays to a target level),
  which is the behavior behind real spaced-repetition schedulers — so the spaced
  line stays near the top across the whole horizon while the study-once line
  collapses. It's a teaching model, labeled as illustrative, not a clinical
  prediction.
- **The flashcards** implement SM-2 faithfully: each card carries an ease factor
  (starting 2.5), a repetition count, and an interval. Grading updates the ease
  (`EF' = EF + (0.1 − (5−q)(0.08 + (5−q)·0.02))`, floored at 1.3), and intervals
  grow `1 day → 6 days → interval × ease`. "Again" resets the card to relearn.
- **The charts** are hand-rolled SVG following a validated, colorblind-safe
  data-visualization palette — thin marks, one baseline, recessive gridlines,
  a legend, and full light/dark theming. No chart library.

## Design notes

- **Accessible & theme-aware.** Works in light and dark (respects your OS setting
  and a manual toggle), honors `prefers-reduced-motion`, keeps content visible
  for print and when `IntersectionObserver` is unavailable, and never encodes
  meaning by color alone.
- **Private by construction.** Nothing leaves the page. The only stored state is
  your flashcard schedule and theme choice, in your own browser.
- **Keyboard-friendly flashcards.** `Space` reveals the answer; `1`–`4` grade it.

## A note on sources & honesty

COMPOUND is an **educational synthesis**. It references the ideas of the
researchers and creators it names; it is **not affiliated with, endorsed by, or
produced in partnership with** any of them, nor with Harvard University, Stanford
University, or any individual creator. Figures marked "illustrative" are teaching
models, not measurements. The attention techniques are tools for *attention* —
pointed at something worth people's time they teach and inspire; pointed at
nothing they're just noise. Verify anything you'd stake a decision on against the
primary sources, which are cited in the page footer.

## Repo layout

```
index.html                     # ← COMPOUND, the flagship (this is the whole app)
games/
  pokemon-dream-journey/       # an earlier project kept in the repo — a Pokémon
                               # Black/White-style browser RPG (see its own README)
```

## License

MIT.
