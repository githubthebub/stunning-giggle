# Editing Compass content

All coaching content is curated, versioned data — **no text is generated at runtime.** Edit these files freely; the app validates them against the zod schemas in `../schema/index.ts` on load, and the test suite + linter check them in CI.

After any edit:

```bash
npm run lint:content   # banned copy, flow structure, canonical vocabulary, citations
npm test               # full schema validation of every file
```

## Safety-copy rules (apply to every file)

- **Not therapy, not a medical device.** Never diagnose; never promise to treat, cure, or heal.
- **Banned/overclaiming terms** (the linter enforces these): `life-changing`, `better than a therapist`, `cure`, `guaranteed`, `fix you`, `heal you`, `transform your life`, `miracle`, and clinical words (`therapist`, `therapy`, `clinical`, `diagnose`, `diagnosis`) in coaching copy. Public-source **citations** may contain book titles like "…Mood Therapy".
- Tough-love but warm: challenge excuses, surface blind spots, never shame. End reflective content in one small next step. Nudge toward real-world support.

## Canonical vocabulary (use these ids exactly)

- **valueDimensions**: `autonomy, connection, growth, security, contribution, health, creativity, integrity, adventure, recognition`
- **patternTags**: `avoidance, people_pleasing, perfectionism, self_criticism, rumination, overcommitment, comparison, black_and_white, fear_of_failure, need_for_control`
- **topics**: `career, relationships, habits, burnout, motivation, self_worth`
- **distortionIds**: `all_or_nothing, overgeneralization, mental_filter, discounting_positive, jumping_to_conclusions, magnification, emotional_reasoning, should_statements, labeling, personalization`

`npm run fix:vocab` normalises stray ids back onto this vocabulary.

## Files

### `values/valuesModel.json`
The onboarding questionnaire. `valueDimensions` + `patternTags` (all 10 each) and `questions[]` with options carrying `valueWeights` / `patternWeights` (small ints keyed by canonical ids). Scoring sums the weights.

### `flows/*.json`  — coaching decision trees
```jsonc
{ "id", "topic", "title", "description", "estMinutes", "startNodeId", "nodes": [ ... ] }
```
Node types: `prompt` (text + next), `reframe` (text + next), `choice` (text + options[{id,label,next,effects?}]), `reflection` (text + capture{field,placeholder} + next), `action` (text + action{title,description,suggestQuestId} — terminal). Every path must end at an `action`. To add a flow: drop the file here **and** register it in `../content/registry.ts`.

### `questions/questionBank.json`
`{ id, text, topics[], patternTags[], weight }`. Open Socratic questions selected by topic + pattern, weighted and non-repeating.

### `distortions/distortions.json`
The 10 cognitive distortions, each with `description`, `example`, `reframePrompts[]`, a `reframeTemplate`, and a public-source `citation`.

### `quests/starterQuests.json`
`{ id, title, description, cadence: once|daily|weekly, linkedValues[], linkedPatterns[], topics[], estMinutes, encouragement }`. Keep actions small; keep `encouragement` guilt-free.

### `journal/prompts.json`
`{ id, text, topics[], patternTags[], weight }`.

### `safety/crisisKeywords.json`
Maintained keyword list scanned on-device (word-boundary matched). **Must be reviewed by a qualified mental-health professional and localised before release.**

### `safety/crisisResources.json`
Per-region crisis lines — **placeholders**; replace with verified, localised resources before release.

### `legal/*.md`
`disclaimer.md`, `terms.md`, `privacy.md` — **placeholder** legal copy. Edit the Markdown, then run `npm run sync:legal` to regenerate `legal/legalText.ts` (what the app bundles). **A licensed attorney must review these before release.**
