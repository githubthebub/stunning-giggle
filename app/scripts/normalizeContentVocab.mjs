/**
 * One-shot content-vocabulary normaliser.
 *
 * Coerces every pattern/topic/value reference in the content files onto the
 * canonical vocabulary:
 *   - patternTags / linkedPatterns  -> canonical pattern ids (all_or_nothing is
 *     remapped to black_and_white; unknown ids are dropped)
 *   - topics                        -> canonical topic ids (unknown dropped)
 *   - linkedValues                  -> canonical value ids; a value that is
 *     actually a topic is moved into topics; otherwise dropped
 *
 * Safe to re-run (idempotent). Also available as `npm run fix:vocab`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const contentDir = join(here, '..', 'src', 'data', 'content');

const PATTERNS = new Set([
  'avoidance', 'people_pleasing', 'perfectionism', 'self_criticism', 'rumination',
  'overcommitment', 'comparison', 'black_and_white', 'fear_of_failure', 'need_for_control',
]);
const TOPICS = new Set(['career', 'relationships', 'habits', 'burnout', 'motivation', 'self_worth']);
const VALUES = new Set([
  'autonomy', 'connection', 'growth', 'security', 'contribution', 'health',
  'creativity', 'integrity', 'adventure', 'recognition',
]);
const PATTERN_REMAP = { all_or_nothing: 'black_and_white' };

const uniq = (arr) => [...new Set(arr)];

function fixPatterns(ids = []) {
  return uniq(ids.map((id) => PATTERN_REMAP[id] ?? id).filter((id) => PATTERNS.has(id)));
}
function fixTopics(ids = []) {
  return uniq(ids.filter((id) => TOPICS.has(id)));
}

function read(rel) {
  return JSON.parse(readFileSync(join(contentDir, rel), 'utf8'));
}
function write(rel, obj) {
  writeFileSync(join(contentDir, rel), JSON.stringify(obj, null, 2) + '\n');
}

// questionBank
const qb = read('questions/questionBank.json');
qb.questions.forEach((q) => {
  q.patternTags = fixPatterns(q.patternTags);
  q.topics = fixTopics(q.topics);
});
write('questions/questionBank.json', qb);

// journal prompts
const jp = read('journal/prompts.json');
jp.prompts.forEach((p) => {
  p.patternTags = fixPatterns(p.patternTags);
  p.topics = fixTopics(p.topics);
});
write('journal/prompts.json', jp);

// quests
const quests = read('quests/starterQuests.json');
quests.quests.forEach((q) => {
  q.linkedPatterns = fixPatterns(q.linkedPatterns);
  const movedTopics = (q.linkedValues ?? []).filter((v) => !VALUES.has(v) && TOPICS.has(v));
  q.topics = fixTopics([...(q.topics ?? []), ...movedTopics]);
  q.linkedValues = uniq((q.linkedValues ?? []).filter((v) => VALUES.has(v)));
});
write('quests/starterQuests.json', quests);

// flow effects
for (const f of ['flows/career-clarity.json', 'flows/burnout.json', 'flows/relationships.json']) {
  const flow = read(f);
  flow.nodes.forEach((n) => {
    (n.options ?? []).forEach((o) => {
      if (o.effects?.patternTags) o.effects.patternTags = fixPatterns(o.effects.patternTags);
    });
  });
  write(f, flow);
}

// values model weight-map keys
const vm = read('values/valuesModel.json');
vm.questions.forEach((q) => {
  q.options.forEach((o) => {
    if (o.valueWeights) {
      o.valueWeights = Object.fromEntries(
        Object.entries(o.valueWeights).filter(([k]) => VALUES.has(k)),
      );
    }
    if (o.patternWeights) {
      o.patternWeights = Object.fromEntries(
        Object.entries(o.patternWeights)
          .map(([k, v]) => [PATTERN_REMAP[k] ?? k, v])
          .filter(([k]) => PATTERNS.has(k)),
      );
    }
  });
});
write('values/valuesModel.json', vm);

console.log('Normalised content vocabulary onto the canonical ids.');
