import {
  startFlow,
  advance,
  validateFlow,
  collectedPatternTags,
} from '../src/features/flows/engine';
import type { Flow } from '../src/data/schema';

const flow: Flow = {
  id: 'f',
  topic: 'career',
  title: 't',
  description: '',
  estMinutes: 5,
  startNodeId: 'n1',
  nodes: [
    { id: 'n1', type: 'prompt', text: 'hi', next: 'n2' },
    {
      id: 'n2',
      type: 'choice',
      text: 'pick',
      options: [
        { id: 'o1', label: 'avoid', next: 'n3', effects: { patternTags: ['avoidance'] } },
        { id: 'o2', label: 'face', next: 'n4' },
      ],
    },
    { id: 'n3', type: 'reflection', text: 'why', capture: { field: 'r1', placeholder: '' }, next: 'n5' },
    { id: 'n4', type: 'reframe', text: 'consider', next: 'n5' },
    { id: 'n5', type: 'action', text: 'go', action: { title: 'do one thing', description: 'x', suggestQuestId: null } },
  ],
};

test('valid fixture flow has no structural issues', () => {
  expect(validateFlow(flow)).toEqual([]);
});

test('walks a branch to a terminal action, collecting tags and captures', () => {
  let s = startFlow(flow);
  expect(s.currentNodeId).toBe('n1');
  s = advance(flow, s, { kind: 'next' }); // -> n2
  expect(s.currentNodeId).toBe('n2');
  s = advance(flow, s, { kind: 'choice', optionId: 'o1' }); // -> n3
  expect(s.currentNodeId).toBe('n3');
  expect(collectedPatternTags(s)).toEqual(['avoidance']);
  s = advance(flow, s, { kind: 'reflection', text: 'hello' }); // -> n5 action
  expect(s.finished).toBe(true);
  expect(s.action?.title).toBe('do one thing');
  expect(s.captures.r1).toBe('hello');
});

test('other branch reaches the same action without tags', () => {
  let s = startFlow(flow);
  s = advance(flow, s, { kind: 'next' });
  s = advance(flow, s, { kind: 'choice', optionId: 'o2' }); // -> n4 reframe
  expect(s.currentNodeId).toBe('n4');
  s = advance(flow, s, { kind: 'next' }); // -> n5 action
  expect(s.finished).toBe(true);
  expect(collectedPatternTags(s)).toEqual([]);
});

test('detects broken next references', () => {
  const broken: Flow = { ...flow, nodes: [{ id: 'n1', type: 'prompt', text: '', next: 'nowhere' }], startNodeId: 'n1' };
  expect(validateFlow(broken).length).toBeGreaterThan(0);
});
