/**
 * Content integrity: validates the real, authored seed content against the
 * schemas, flow structure rules, and the canonical vocabulary. This is the
 * guard that keeps hand-edited content honest.
 */
import { appContent, contentIssues } from '../src/data/contentLoader';
import { validateFlow } from '../src/features/flows/engine';
import {
  PATTERN_TAG_IDS,
  TOPIC_IDS,
  VALUE_DIMENSION_IDS,
  DISTORTION_IDS,
} from '../src/data/schema';

const PATTERNS = new Set<string>(PATTERN_TAG_IDS);
const TOPICS = new Set<string>(TOPIC_IDS);
const VALUES = new Set<string>(VALUE_DIMENSION_IDS);

test('all content validates against the schemas', () => {
  if (contentIssues.length) {
    // Surface the specific problems in the failure message.
    throw new Error('content validation issues:\n' + contentIssues.map((i) => `${i.file} ${i.message}`).join('\n'));
  }
  expect(contentIssues).toEqual([]);
});

test('the seed corpus meets the deliverable minimums', () => {
  expect(appContent.flows.length).toBeGreaterThanOrEqual(2);
  expect(appContent.questionBank.questions.length).toBeGreaterThanOrEqual(50);
  expect(appContent.distortions.distortions.length).toBe(10);
  expect(appContent.quests.quests.length).toBeGreaterThanOrEqual(8);
  expect(appContent.journalPrompts.prompts.length).toBeGreaterThanOrEqual(20);
  expect(appContent.valuesModel.questions.length).toBeGreaterThanOrEqual(8);
  expect(appContent.crisisKeywords.keywords.length).toBeGreaterThan(0);
  expect(appContent.crisisResources.regions.length).toBeGreaterThan(0);
});

test('every coaching flow is structurally valid', () => {
  for (const flow of appContent.flows) {
    expect(validateFlow(flow)).toEqual([]);
  }
});

test('distortions use exactly the canonical ids', () => {
  const ids = appContent.distortions.distortions.map((d) => d.id).sort();
  expect(ids).toEqual([...DISTORTION_IDS].sort());
});

test('all pattern-tag and topic references use the canonical vocabulary', () => {
  const badPatterns = new Set<string>();
  const badTopics = new Set<string>();

  const notePattern = (id: string) => {
    if (!PATTERNS.has(id)) badPatterns.add(id);
  };
  const noteTopic = (id: string) => {
    if (!TOPICS.has(id)) badTopics.add(id);
  };

  appContent.questionBank.questions.forEach((q) => {
    q.patternTags.forEach(notePattern);
    q.topics.forEach(noteTopic);
  });
  appContent.journalPrompts.prompts.forEach((p) => {
    p.patternTags.forEach(notePattern);
    p.topics.forEach(noteTopic);
  });
  appContent.quests.quests.forEach((q) => {
    q.linkedPatterns.forEach(notePattern);
    q.topics.forEach(noteTopic);
    q.linkedValues.forEach((v) => {
      if (!VALUES.has(v)) badPatterns.add(`value:${v}`);
    });
  });
  appContent.flows.forEach((f) => {
    f.nodes.forEach((n) => {
      n.options?.forEach((o) => o.effects?.patternTags?.forEach(notePattern));
    });
  });

  expect({ badPatterns: [...badPatterns], badTopics: [...badTopics] }).toEqual({
    badPatterns: [],
    badTopics: [],
  });
});

test('values model declares the full canonical value + pattern sets', () => {
  const valueIds = appContent.valuesModel.valueDimensions.map((d) => d.id).sort();
  const patternIds = appContent.valuesModel.patternTags.map((t) => t.id).sort();
  expect(valueIds).toEqual([...VALUE_DIMENSION_IDS].sort());
  expect(patternIds).toEqual([...PATTERN_TAG_IDS].sort());
});
