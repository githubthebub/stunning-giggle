# Compass

A structured personal-growth **coaching app** that runs entirely **on-device** — no AI, no LLM, no server, no cloud sync, no analytics. Everything it does is deterministic and rules-based over curated, editable content.

Compass aims to deliver the *value* of a tough-love coach — challenges instead of empty validation, gets to the real issue fast, tracks your patterns over time, turns reflection into one concrete next step — using hand-authored content and simple, auditable logic.

> ⚠️ **Compass is not therapy and not a medical device.** It does not diagnose, treat, or cure anything. It is a self-reflection and coaching tool and is not a substitute for professional mental-health care. The disclaimer, Terms of Service, and Privacy Policy shipped here are **placeholders** and **must be reviewed by a licensed attorney before release** (see [Legal](#legal--safety)).

---

## Stack

- **Expo / React Native + TypeScript** — cross-platform (iOS/Android), offline-first, first-party local storage primitives.
- **expo-sqlite** for structured on-device data; **expo-secure-store** (iOS Keychain / Android Keystore) holds the encryption key; **expo-crypto** for key/ID generation.
- **crypto-js** for app-layer field encryption of sensitive free-text.
- **zod** validates all content at load time.
- **React Navigation** for navigation.

Why Expo/RN over Flutter: the local-first primitives are all first-party, content-as-typed-data is ergonomic, and the dependency surface stays small and auditable — which matters for the "no network calls with user content" guarantee.

---

## Run it

```bash
cd app
npm install
npm start          # then press i (iOS), a (Android), or scan the QR in Expo Go
```

Runs in **Expo Go** — no custom native build required for day-to-day work. (For production-grade whole-database encryption see [Encryption](#encryption--the-sqlcipher-upgrade).)

### Play it in a browser (no device needed)

A browser-playable build bundles the **same** engines and content (via esbuild — no logic duplication) into one self-contained HTML file:

```bash
npm run build:web      # writes web/compass.html (open it directly in any browser)
```

`web/compass.html` is fully offline and stores data in the browser's `localStorage`. It's a faithful port of the app loop (gate → onboarding → home → flows → toolkit → journal → progress → quests → settings → crisis); only the presentation (DOM vs React Native) and storage (localStorage vs encrypted SQLite) differ.

### Verify the logic (no device needed)

The deterministic "no-AI" core is fully unit-tested and runs in plain Node:

```bash
npm test               # engines + full content validation (30 tests)
npm run typecheck:core # type-check the pure core
npm run lint:content   # banned-copy, flow structure, vocabulary, citations
```

---

## What's in the box

| Area | How it works (deterministically) |
|---|---|
| **Values onboarding** | An 11-question questionnaire → `scoreValues` sums hand-authored weights → top values + flagged pattern tags. |
| **Coaching flows** | 3 branching decision-tree conversations (career, burnout, relationships). A pure interpreter walks the tree and ends every path at one concrete action. |
| **Socratic questions** | 60 tagged questions; `selectQuestion` picks by topic + your patterns, weighted and non-repeating (no randomness). |
| **CBT toolkit** | Thought record, a distortion identifier (pick a distortion → pre-written, cited reframe), and a values-clarification exercise. All 10 distortions cited to public frameworks. |
| **Pattern tracking** | `detectRecurrences` counts tagged themes in a rolling window and gently calls out recurrences (counting only — no inference). |
| **Quests** | 12 starter micro-actions + flow-generated ones; encouraging check-in loop with **no streaks or guilt**. |
| **Guided journaling** | 30 curated prompts; entries encrypted on-device. |

Seed content totals: **10 values · 10 pattern tags · 60 questions · 10 distortions · 12 quests · 30 journal prompts · 3 flows (17/20/18 nodes) · 40 crisis keywords.**

---

## Project structure

```
app/
  App.tsx                     # providers + crisis overlay
  index.ts                    # Expo entry
  app.config.ts               # Expo config (age/region surfaced via extra)
  src/
    config/appConfig.ts       # ALL configurable knobs (age gate, thresholds…)
    data/
      content/                # ← editable curated content (see content/README.md)
      schema/index.ts         # zod schemas = the content contract
      contentLoader.ts        # validates content at load
    features/                 # PURE deterministic engines (unit-tested)
      onboarding/scoring.ts
      flows/engine.ts
      questions/selector.ts
      patterns/detector.ts
      quests/engine.ts
      safety/crisisScan.ts
    storage/                  # encrypted SQLite: db, keys, crypto, repositories
    state/AppStateProvider.tsx
    navigation/               # gate → onboarding → tabs + detail stack
    screens/                  # UI (gate, onboarding, home, flows, toolkit, journal, patterns, quests, settings, crisis)
    components/               # shared UI + a tiny Markdown renderer
  __tests__/                  # engine + content-integrity tests
  scripts/                    # syncLegal, normalizeContentVocab, lintContent
```

The hard rule: **`features/` and `data/content/` never import UI, and screens never hard-code coaching text.** Every question, reframe, and branch lives in an editable data file.

---

## Editing content

All coaching content lives in `src/data/content/**` as JSON (+ Markdown for legal docs), cleanly separated from app logic. See **[`content/README.md`](content/README.md)** for the shape of each file and the safety-copy rules. After editing:

```bash
npm run lint:content   # catches banned copy, broken flows, bad tags, missing citations
npm test               # re-validates the whole corpus against the schemas
```

Legal docs are authored in Markdown (`content/legal/*.md`); run `npm run sync:legal` to regenerate the bundled string module the app imports.

---

## On-device data model

Everything is stored in a local SQLite database (`compass.db`) in the app sandbox. Sensitive free-text columns (journal bodies, thought records, reflections, notes, assessment answers) are **encrypted** before they are written.

| Table | Holds | Encrypted fields |
|---|---|---|
| `user_profile` | acks (age/disclaimer/terms/privacy, versioned), values profile, pattern tags, settings | — |
| `assessments` | onboarding answers + derived profile | answers |
| `mood_logs` | mood score + tags + note | note |
| `pattern_events` | one row per tagged theme occurrence (feeds the counter) | — |
| `journal_entries` | prompt id + body + tags | body |
| `thought_records` | CBT fields + tagged distortions | all free-text |
| `flow_sessions` | flow id, path taken, resulting action | path |
| `active_quests` / `quest_checkins` | quests + check-ins | check-in notes |
| `question_history` | served questions (drives non-repeating selection) | — |
| `insight_log` | last-surfaced time per tag (recurrence cooldown) | — |

**Nothing leaves the device.** There is no account, no backend, no sync, and no analytics SDK. The app makes no network calls carrying user content. "Erase all my data" (Settings) deletes every row and destroys the encryption key.

### Encryption & the SQLCipher upgrade

The key is a 256-bit random value generated on first launch and stored only in the OS secure enclave via `expo-secure-store`. Sensitive fields are encrypted with AES (crypto-js) at the repository layer (`src/storage/crypto.ts`). This runs in Expo Go for fast iteration.

For production-grade **whole-database** encryption, swap the storage layer to SQLCipher (e.g. via a config plugin + custom dev/EAS build). The repository layer is written against the small `encryptString`/`decryptString` interface specifically so this is a localised change.

---

## Configuration

`src/config/appConfig.ts` is the single source of truth for tunables:

- `minimumAge` (default **18**) — the age gate threshold.
- `disclaimerVersion` / `termsVersion` / `privacyVersion` — bump to re-prompt acknowledgement.
- `patterns.{windowDays, minOccurrences, cooldownDays}` — recurrence call-out rules.
- `questionSelection.*` — weighting/recency for Socratic selection.
- `defaultCrisisRegion` — which region's crisis lines to show.

---

## Legal & safety

Non-negotiable safety features, all implemented:

- **First-launch gate**: versioned disclaimer + 18+ age gate; the disclaimer is re-reachable anytime from Settings.
- **Crisis handling**: an on-device keyword scan (`src/data/content/safety/crisisKeywords.json`, a maintained list) over every free-text input; on a match the app immediately shows a calm, **non-clinical** crisis screen with configurable hotline info (`crisisResources.json`, placeholder per region) and encourages contacting a professional or trusted person. The app never counsels or diagnoses a crisis.
- **No overclaiming**: `npm run lint:content` rejects banned/overclaiming copy ("life-changing", "better than a therapist", clinical language, etc.).
- **Nudges toward real-world support**, not app dependence.

**⚠️ Attorney review required.** The `disclaimer.md`, `terms.md`, and `privacy.md` files are **placeholders**. They are **not legal advice and are not represented as legally sufficient.** A licensed attorney must review all disclaimers, Terms, and Privacy Policy — and a qualified mental-health professional should review the crisis keyword list and resources, which must also be localised — **before any release.**
