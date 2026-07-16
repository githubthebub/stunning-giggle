import {
  detectRecurrences,
  filterByCooldown,
  formatInsight,
  type PatternEvent,
} from '../src/features/patterns/detector';

const NOW = new Date('2026-07-16T00:00:00Z');

function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
}

const events: PatternEvent[] = [
  { tag: 'avoidance', at: daysAgo(1) },
  { tag: 'avoidance', at: daysAgo(2) },
  { tag: 'avoidance', at: daysAgo(3) },
  { tag: 'avoidance', at: daysAgo(4) },
  { tag: 'avoidance', at: daysAgo(5) },
  { tag: 'avoidance', at: daysAgo(40) }, // outside 30-day window
  { tag: 'perfectionism', at: daysAgo(2) },
];

test('counts occurrences inside the window and applies the threshold', () => {
  const insights = detectRecurrences(events, { now: NOW });
  expect(insights).toHaveLength(1);
  expect(insights[0].tag).toBe('avoidance');
  expect(insights[0].count).toBe(5); // the 40-day-old event is excluded
});

test('lower threshold surfaces everything present, strongest first', () => {
  const insights = detectRecurrences(events, { now: NOW, minOccurrences: 1 });
  expect(insights.map((i) => i.tag)).toEqual(['avoidance', 'perfectionism']);
});

test('cooldown filters recently-surfaced insights', () => {
  const insights = detectRecurrences(events, { now: NOW });
  const suppressed = filterByCooldown(insights, { avoidance: daysAgo(2) }, { now: NOW });
  expect(suppressed).toHaveLength(0);
  const allowed = filterByCooldown(insights, { avoidance: daysAgo(10) }, { now: NOW });
  expect(allowed).toHaveLength(1);
});

test('formatInsight composes a gentle, non-clinical sentence', () => {
  const insights = detectRecurrences(events, { now: NOW });
  const text = formatInsight(insights[0], 'Avoidance', 'It is common and workable.');
  expect(text).toContain('Avoidance');
  expect(text).toContain('5');
  expect(text).toContain('workable');
});
