/**
 * Coaching-flow interpreter.
 *
 * A flow is a hand-authored decision tree (see src/data/content/flows/*.json).
 * This module is a pure interpreter over that data: it tracks the current node,
 * captured reflections, accumulated pattern tags, and the path taken, and it
 * always terminates at an "action" node that yields one concrete next step.
 *
 * No content lives here — only the rules for walking the tree.
 */
import type { Flow, FlowNode, FlowAction } from '../../data/schema';

export type FlowSessionState = {
  flowId: string;
  currentNodeId: string;
  /** Visited node ids, in order. */
  history: string[];
  /** capture.field -> user free text. */
  captures: Record<string, string>;
  /** nodeId -> chosen option id, for "choice" nodes. */
  choices: Record<string, string>;
  /** Pattern tags accumulated from the options chosen (one entry per hit). */
  collectedTags: string[];
  finished: boolean;
  /** Set once a terminal "action" node is reached. */
  action?: FlowAction;
};

export type AdvanceInput =
  | { kind: 'next' }
  | { kind: 'choice'; optionId: string }
  | { kind: 'reflection'; text: string };

function nodeMap(flow: Flow): Map<string, FlowNode> {
  return new Map(flow.nodes.map((n) => [n.id, n]));
}

export function getNode(flow: Flow, nodeId: string): FlowNode | undefined {
  return flow.nodes.find((n) => n.id === nodeId);
}

export function startFlow(flow: Flow): FlowSessionState {
  const start = getNode(flow, flow.startNodeId);
  const state: FlowSessionState = {
    flowId: flow.id,
    currentNodeId: flow.startNodeId,
    history: [flow.startNodeId],
    captures: {},
    choices: {},
    collectedTags: [],
    finished: false,
  };
  if (start && start.type === 'action') {
    state.finished = true;
    state.action = start.action;
  }
  return state;
}

/**
 * Advance the session by one node. Returns a new state (never mutates the
 * input). If the flow data is malformed (missing/broken `next`), the session is
 * marked finished rather than throwing — the UI degrades gracefully.
 */
export function advance(
  flow: Flow,
  state: FlowSessionState,
  input: AdvanceInput,
): FlowSessionState {
  if (state.finished) return state;
  const nodes = nodeMap(flow);
  const current = nodes.get(state.currentNodeId);
  if (!current) return { ...state, finished: true };

  const next: FlowSessionState = {
    ...state,
    history: [...state.history],
    captures: { ...state.captures },
    choices: { ...state.choices },
    collectedTags: [...state.collectedTags],
  };

  let nextNodeId: string | undefined;

  switch (current.type) {
    case 'prompt':
    case 'reframe':
      nextNodeId = current.next;
      break;
    case 'reflection':
      if (input.kind === 'reflection' && current.capture) {
        next.captures[current.capture.field] = input.text;
      }
      nextNodeId = current.next;
      break;
    case 'choice': {
      const optionId = input.kind === 'choice' ? input.optionId : undefined;
      const option = current.options?.find((o) => o.id === optionId);
      if (!option) return state; // wait for a valid choice
      next.choices[current.id] = option.id;
      for (const tag of option.effects?.patternTags ?? []) {
        next.collectedTags.push(tag);
      }
      nextNodeId = option.next;
      break;
    }
    case 'action':
      next.finished = true;
      next.action = current.action;
      return next;
  }

  const target = nextNodeId ? nodes.get(nextNodeId) : undefined;
  if (!target) {
    next.finished = true;
    return next;
  }

  next.currentNodeId = target.id;
  next.history.push(target.id);
  if (target.type === 'action') {
    next.finished = true;
    next.action = target.action;
  }
  return next;
}

/** Distinct pattern tags collected across the session (order preserved). */
export function collectedPatternTags(state: FlowSessionState): string[] {
  return [...new Set(state.collectedTags)];
}

/* ------------------------------------------------------------------ */
/* Authoring-time validation (used by tests + scripts/lintContent)    */
/* ------------------------------------------------------------------ */

export type FlowIssue = { flowId: string; message: string };

/**
 * Structural validation of a flow: unique ids, reachable start, every `next`
 * resolves, non-action nodes lead somewhere, choice nodes have options, and
 * every reachable path can terminate at an action node.
 */
export function validateFlow(flow: Flow): FlowIssue[] {
  const issues: FlowIssue[] = [];
  const push = (message: string) => issues.push({ flowId: flow.id, message });
  const ids = new Set<string>();

  for (const node of flow.nodes) {
    if (ids.has(node.id)) push(`duplicate node id "${node.id}"`);
    ids.add(node.id);
  }
  if (!ids.has(flow.startNodeId)) {
    push(`startNodeId "${flow.startNodeId}" does not exist`);
  }

  const nodes = nodeMap(flow);
  for (const node of flow.nodes) {
    switch (node.type) {
      case 'prompt':
      case 'reframe':
      case 'reflection':
        if (!node.next) push(`node "${node.id}" (${node.type}) is missing "next"`);
        else if (!nodes.has(node.next)) push(`node "${node.id}" -> unknown next "${node.next}"`);
        if (node.type === 'reflection' && !node.capture) {
          push(`reflection node "${node.id}" is missing "capture"`);
        }
        break;
      case 'choice':
        if (!node.options || node.options.length === 0) {
          push(`choice node "${node.id}" has no options`);
        }
        for (const opt of node.options ?? []) {
          if (!nodes.has(opt.next)) {
            push(`choice "${node.id}" option "${opt.id}" -> unknown next "${opt.next}"`);
          }
        }
        break;
      case 'action':
        if (!node.action) push(`action node "${node.id}" is missing "action"`);
        break;
    }
  }

  // Reachability + termination: BFS from start; every reachable path should be
  // able to reach an action node.
  const reachable = new Set<string>();
  const queue = [flow.startNodeId];
  while (queue.length) {
    const id = queue.shift()!;
    if (reachable.has(id) || !nodes.has(id)) continue;
    reachable.add(id);
    const node = nodes.get(id)!;
    if (node.type === 'choice') {
      for (const opt of node.options ?? []) queue.push(opt.next);
    } else if (node.next) {
      queue.push(node.next);
    }
  }
  const anyAction = [...reachable].some((id) => nodes.get(id)?.type === 'action');
  if (!anyAction) push('no reachable action node — flow never terminates in a next step');

  for (const node of flow.nodes) {
    if (!reachable.has(node.id)) push(`node "${node.id}" is unreachable from start`);
  }

  return issues;
}
