import { suggestQuests, questProgress, scoreQuest } from '../src/features/quests/engine';
import type { Quest } from '../src/data/schema';

const pack: Quest[] = [
  {
    id: 'q_a',
    title: 'A',
    description: '',
    cadence: 'once',
    linkedValues: [],
    linkedPatterns: ['avoidance'],
    topics: ['habits'],
    estMinutes: 2,
    encouragement: 'nice',
  },
  {
    id: 'q_b',
    title: 'B',
    description: '',
    cadence: 'daily',
    linkedValues: [],
    linkedPatterns: ['perfectionism'],
    topics: ['career'],
    estMinutes: 5,
    encouragement: 'ok',
  },
];

test('scores by pattern overlap', () => {
  expect(scoreQuest(pack[0], { patterns: ['avoidance'] })).toBe(2);
  expect(scoreQuest(pack[1], { patterns: ['avoidance'] })).toBe(0);
});

test('suggests best-matching quests and honours exclusions', () => {
  const s = suggestQuests(pack, { patterns: ['avoidance'] }, 2);
  expect(s[0].id).toBe('q_a');
  const excluded = suggestQuests(pack, { patterns: ['avoidance'], excludeIds: ['q_a'] }, 2);
  expect(excluded.map((q) => q.id)).not.toContain('q_a');
});

test('progress counts completed check-ins without penalising skips', () => {
  const p = questProgress([
    { at: '2026-07-10T00:00:00Z', status: 'done' },
    { at: '2026-07-12T00:00:00Z', status: 'skipped' },
    { at: '2026-07-14T00:00:00Z', status: 'done' },
  ]);
  expect(p.completed).toBe(2);
  expect(p.totalCheckIns).toBe(3);
  expect(p.lastCheckInAt).toBe('2026-07-14T00:00:00Z');
});
