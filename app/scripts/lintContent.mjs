/**
 * Dependency-free content linter. Run with: npm run lint:content
 *
 * Checks the curated content for:
 *   1. Banned / overclaiming copy (word-boundary matched) in user-facing text.
 *      Citations and the framework note are exempt (public book titles legitimately
 *      contain words like "Therapy"). Legal docs are exempt (attorney-reviewed).
 *   2. Coaching-flow structural integrity (valid next refs, reachable terminal action).
 *   3. Canonical vocabulary for pattern/topic references.
 *   4. Presence of a citation on every distortion.
 *
 * Exits non-zero if any problem is found, so it can gate CI.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const contentDir = join(here, '..', 'src', 'data', 'content');
const read = (rel) => JSON.parse(readFileSync(join(contentDir, rel), 'utf8'));

const PATTERNS = new Set([
  'avoidance', 'people_pleasing', 'perfectionism', 'self_criticism', 'rumination',
  'overcommitment', 'comparison', 'black_and_white', 'fear_of_failure', 'need_for_control',
]);
const TOPICS = new Set(['career', 'relationships', 'habits', 'burnout', 'motivation', 'self_worth']);
const DISTORTION_IDS = [
  'all_or_nothing', 'overgeneralization', 'mental_filter', 'discounting_positive',
  'jumping_to_conclusions', 'magnification', 'emotional_reasoning', 'should_statements',
  'labeling', 'personalization',
];

const BANNED = [
  'life-changing', 'life changing', 'better than a therapist', 'better than therapy',
  'cure', 'guaranteed', 'fix you', 'heal you', 'transform your life', 'miracle',
  'therapist', 'therapy', 'clinical', 'diagnose', 'diagnosis',
];
const bannedRes = BANNED.map((w) => ({
  word: w,
  re: new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i'),
}));

const problems = [];
const fail = (where, msg) => problems.push(`${where}: ${msg}`);

function checkCopy(where, text) {
  if (typeof text !== 'string') return;
  for (const { word, re } of bannedRes) {
    if (re.test(text)) fail(where, `banned/overclaiming term "${word}" in: "${text.slice(0, 70)}…"`);
  }
}

/* 1 + 3: coaching copy + vocab */
const qb = read('questions/questionBank.json');
qb.questions.forEach((q) => {
  checkCopy(`questionBank/${q.id}`, q.text);
  q.patternTags.forEach((t) => !PATTERNS.has(t) && fail(`questionBank/${q.id}`, `non-canonical patternTag "${t}"`));
  q.topics.forEach((t) => !TOPICS.has(t) && fail(`questionBank/${q.id}`, `non-canonical topic "${t}"`));
});

const jp = read('journal/prompts.json');
jp.prompts.forEach((p) => {
  checkCopy(`journal/${p.id}`, p.text);
  p.patternTags.forEach((t) => !PATTERNS.has(t) && fail(`journal/${p.id}`, `non-canonical patternTag "${t}"`));
  p.topics.forEach((t) => !TOPICS.has(t) && fail(`journal/${p.id}`, `non-canonical topic "${t}"`));
});

const quests = read('quests/starterQuests.json');
quests.quests.forEach((q) => {
  checkCopy(`quest/${q.id}`, `${q.title} ${q.description} ${q.encouragement}`);
  q.linkedPatterns.forEach((t) => !PATTERNS.has(t) && fail(`quest/${q.id}`, `non-canonical linkedPattern "${t}"`));
});

const vm = read('values/valuesModel.json');
vm.valueDimensions.forEach((d) => checkCopy(`value/${d.id}`, `${d.label} ${d.description}`));
vm.patternTags.forEach((t) => checkCopy(`pattern/${t.id}`, `${t.label} ${t.description} ${t.supportiveNote}`));
vm.questions.forEach((q) => {
  checkCopy(`valuesQ/${q.id}`, `${q.prompt} ${q.helpText ?? ''}`);
  q.options.forEach((o) => checkCopy(`valuesQ/${q.id}/${o.id}`, o.label));
});

/* 2: flow structure + copy */
for (const file of readdirSync(join(contentDir, 'flows'))) {
  const flow = read(`flows/${file}`);
  const ids = new Set(flow.nodes.map((n) => n.id));
  let hasAction = false;
  for (const n of flow.nodes) {
    checkCopy(`flow/${flow.id}/${n.id}`, n.text);
    if (n.type === 'action') {
      hasAction = true;
      checkCopy(`flow/${flow.id}/${n.id}`, `${n.action?.title ?? ''} ${n.action?.description ?? ''}`);
    }
    if (n.next && !ids.has(n.next)) fail(`flow/${flow.id}/${n.id}`, `dangling next "${n.next}"`);
    for (const o of n.options ?? []) {
      checkCopy(`flow/${flow.id}/${n.id}/${o.id}`, o.label);
      if (!ids.has(o.next)) fail(`flow/${flow.id}/${n.id}`, `dangling option next "${o.next}"`);
      for (const t of o.effects?.patternTags ?? []) {
        if (!PATTERNS.has(t)) fail(`flow/${flow.id}/${n.id}`, `non-canonical patternTag "${t}"`);
      }
    }
  }
  if (!hasAction) fail(`flow/${flow.id}`, 'has no terminal action node');
  if (!ids.has(flow.startNodeId)) fail(`flow/${flow.id}`, `startNodeId "${flow.startNodeId}" missing`);
}

/* 4: distortions ids + citations (copy checked, but NOT citation/frameworkNote) */
const dist = read('distortions/distortions.json');
const distIds = dist.distortions.map((d) => d.id).sort();
if (JSON.stringify(distIds) !== JSON.stringify([...DISTORTION_IDS].sort())) {
  fail('distortions', 'ids do not match the canonical distortion set');
}
dist.distortions.forEach((d) => {
  checkCopy(`distortion/${d.id}`, `${d.name} ${d.description} ${d.example} ${d.reframeTemplate} ${(d.reframePrompts || []).join(' ')}`);
  if (!d.citation || !d.citation.trim()) fail(`distortion/${d.id}`, 'missing citation');
});

if (problems.length) {
  console.error(`\nContent lint FAILED with ${problems.length} problem(s):\n`);
  for (const p of problems) console.error('  • ' + p);
  console.error('');
  process.exit(1);
} else {
  console.log('Content lint passed: no banned copy, valid flows, canonical vocabulary, citations present.');
}
