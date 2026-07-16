/**
 * Compass — browser-playable build.
 *
 * This is the SAME app, driven by the SAME deterministic engines and the SAME
 * curated content as the React Native app. It imports src/features/* and the
 * validated content bundle directly (esbuild inlines them), so there is no
 * logic or content drift between this build and the native app. Only the
 * presentation layer (plain DOM instead of React Native) and the storage layer
 * (browser localStorage instead of encrypted SQLite) differ.
 *
 * Data stays in this browser's localStorage — nothing is transmitted.
 */
import { scoreValues, type ValuesAnswers, type ValuesProfile } from '../src/features/onboarding/scoring';
import { startFlow, advance, getNode, collectedPatternTags, type FlowSessionState } from '../src/features/flows/engine';
import { selectQuestion } from '../src/features/questions/selector';
import { detectRecurrences, filterByCooldown, formatInsight, type PatternEvent } from '../src/features/patterns/detector';
import { suggestQuests, questProgress, type CheckIn } from '../src/features/quests/engine';
import { scanForCrisis } from '../src/features/safety/crisisScan';
import { appContent } from '../src/data/contentLoader';
import { disclaimerMarkdown, termsMarkdown, privacyMarkdown } from '../src/data/content/registry';
import { appConfig } from '../src/config/appConfig';

/* ----------------------------- state ----------------------------- */

type Quest = {
  id: string;
  questId: string | null;
  title: string;
  description: string;
  cadence: string;
  checkins: CheckIn[];
};

type State = {
  version: number;
  ageAck: boolean;
  disclaimerAckVersion: number;
  onboarded: boolean;
  valuesProfile: ValuesProfile | null;
  patternTags: string[];
  moodLogs: { at: string; mood: number; tags: string[] }[];
  patternEvents: PatternEvent[];
  journal: { at: string; promptId: string | null; body: string; tags: string[] }[];
  thoughtRecords: { at: string; automaticThought: string; distortions: string[]; reframe: string }[];
  quests: Quest[];
  questionHistory: string[];
  insightLog: Record<string, string>;
  settings: { crisisRegion: string };
};

const KEY = 'compass.web.v1';

function freshState(): State {
  return {
    version: 1,
    ageAck: false,
    disclaimerAckVersion: 0,
    onboarded: false,
    valuesProfile: null,
    patternTags: [],
    moodLogs: [],
    patternEvents: [],
    journal: [],
    thoughtRecords: [],
    quests: [],
    questionHistory: [],
    insightLog: {},
    settings: { crisisRegion: appContent.crisisResources.defaultRegion },
  };
}

let state: State = load();

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...freshState(), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return freshState();
}
function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}
function now(): string {
  return new Date().toISOString();
}
function uid(): string {
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function addPatternEvents(tags: string[], source: string) {
  const at = now();
  for (const tag of tags) state.patternEvents.push({ tag, at, source });
}

/* ----------------------------- dom helpers ----------------------------- */

type Props = Record<string, any>;
function h(tag: string, props: Props = {}, ...children: (Node | string | null | undefined)[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = String(v);
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, String(v));
  }
  for (const c of children) if (c != null) el.append(c);
  return el;
}
const t = (tag: string, cls: string, text: string) => h(tag, { class: cls, text });
const label = (s: string) => t('div', 'label', s);
const muted = (s: string) => t('p', 'muted', s);
const small = (s: string) => t('p', 'small', s);
const spacer = (lg = false) => h('div', { class: lg ? 'spacer lg' : 'spacer' });

function chip(text: string, selected: boolean, onClick?: () => void): HTMLElement {
  return h('div', {
    class: 'chip' + (selected ? ' selected' : '') + (onClick ? '' : ' static'),
    onClick: onClick,
    text,
  });
}
function button(text: string, onClick: () => void, variant = '', disabled = false): HTMLElement {
  return h('button', { class: variant, onClick, disabled: disabled ? 'true' : null }, text);
}

function tinyMarkdown(src: string): HTMLElement {
  const wrap = h('div', { class: 'md' });
  for (const raw of src.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const inline = (s: string) =>
      s
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/_([^_]+)_/g, '<em>$1</em>');
    if (line.startsWith('### ')) wrap.append(h('h3', { html: inline(line.slice(4)) }));
    else if (line.startsWith('## ')) wrap.append(h('h2', { html: inline(line.slice(3)) }));
    else if (line.startsWith('# ')) wrap.append(h('h1', { html: inline(line.slice(2)) }));
    else if (/^[-*]\s+/.test(line)) wrap.append(h('li', { html: inline(line.replace(/^[-*]\s+/, '')) }));
    else wrap.append(h('p', { html: inline(line) }));
  }
  return wrap;
}

/* ----------------------------- routing ----------------------------- */

let activeTab = 'Home';
let detail: { name: string; params?: any } | null = null;
let overlay: 'crisis' | { doc: 'disclaimer' | 'terms' | 'privacy' } | null = null;

const root = document.getElementById('root')!;

function go(tab: string) {
  activeTab = tab;
  detail = null;
  render();
}
function open(name: string, params?: any) {
  detail = { name, params };
  render();
}
function back() {
  detail = null;
  render();
}
function checkCrisis(text: string) {
  if (scanForCrisis(text, appContent.crisisKeywords.keywords).matched) {
    overlay = 'crisis';
    render();
  }
}

/* ----------------------------- gate ----------------------------- */

function screenGate(): HTMLElement {
  const s = h('div', { class: 'screen' });
  if (state.disclaimerAckVersion < appConfig.disclaimerVersion) {
    s.append(t('h1', '', 'Before you start'), spacer());
    const card = h('div', { class: 'card' });
    card.append(tinyMarkdown(disclaimerMarkdown));
    s.append(card, small('You can reopen this anytime from Settings.'),
      button('I understand — continue', () => {
        state.disclaimerAckVersion = appConfig.disclaimerVersion;
        save();
        render();
      }));
    return s;
  }
  s.append(t('h1', '', 'One quick check'), spacer());
  const card = h('div', { class: 'card' });
  card.append(h('p', {}, 'Compass is intended for adults.'),
    muted(`Please confirm you are ${appConfig.minimumAge} or older. This app is a self-reflection and coaching tool — not a substitute for professional support.`));
  s.append(card,
    button(`I am ${appConfig.minimumAge} or older`, () => {
      state.ageAck = true;
      save();
      render();
    }),
    small(`If you are under ${appConfig.minimumAge}, please close the app and consider talking with a trusted adult or a mental-health professional.`));
  return s;
}

/* ----------------------------- onboarding ----------------------------- */

let onbPhase: 'intro' | 'questions' | 'result' = 'intro';
let onbIndex = 0;
let onbAnswers: ValuesAnswers = {};

function valueLabel(id: string) {
  return appContent.valuesModel.valueDimensions.find((d) => d.id === id)?.label ?? id;
}
function patternDef(id: string) {
  return appContent.valuesModel.patternTags.find((p) => p.id === id);
}

function screenOnboarding(): HTMLElement {
  const model = appContent.valuesModel;
  const s = h('div', { class: 'screen' });

  if (onbPhase === 'intro') {
    s.append(
      t('h1', '', "Let's find your bearings"), spacer(),
      h('p', {}, 'A few questions to get to what actually matters to you and the patterns that tend to get in your way. No right answers, and nothing here is shared anywhere — it stays in this browser.'),
      spacer(), muted('Takes about three minutes. Answer honestly; that’s where the value is.'), spacer(true),
      button('Begin', () => { onbPhase = 'questions'; render(); }),
    );
    return s;
  }

  if (onbPhase === 'result') {
    const profile = scoreValues(model, onbAnswers);
    s.append(label('Your bearings'), t('h1', '', 'What matters to you'), spacer());
    const v = h('div', { class: 'card' });
    v.append(t('h3', '', 'Your top values'));
    if (profile.topValues.length) {
      const row = h('div', { class: 'pillbar' });
      profile.topValues.forEach((id) => row.append(chip(valueLabel(id), true)));
      v.append(row);
    } else v.append(muted("We'll learn these as you use the app."));
    s.append(v);

    const p = h('div', { class: 'card' });
    p.append(t('h3', '', 'Patterns worth watching'));
    if (profile.flaggedPatterns.length) {
      profile.flaggedPatterns.forEach((id) => {
        const def = patternDef(id);
        p.append(h('p', {}, def?.label ?? id), def?.supportiveNote ? muted(def.supportiveNote) : null);
      });
    } else p.append(muted("Nothing jumped out yet. Patterns show up over time, and Compass will point them out when they do."));
    s.append(p);
    s.append(small('These are starting points, not labels — and none of it is a diagnosis.'),
      button('Go to Compass', () => {
        state.valuesProfile = profile;
        state.patternTags = profile.flaggedPatterns;
        state.onboarded = true;
        save();
        render();
      }));
    return s;
  }

  // questions
  const q = model.questions[onbIndex];
  const selected = onbAnswers[q.id] ?? [];
  s.append(label(`Question ${onbIndex + 1} of ${model.questions.length}`), spacer(),
    t('h2', '', q.prompt), q.helpText ? muted(q.helpText) : null,
    q.type === 'multi' ? small('Choose any that fit.') : null, spacer());
  q.options.forEach((opt) => {
    s.append(chip(opt.label, selected.includes(opt.id), () => {
      const cur = onbAnswers[q.id] ?? [];
      if (q.type === 'multi') {
        onbAnswers[q.id] = cur.includes(opt.id) ? cur.filter((o) => o !== opt.id) : [...cur, opt.id];
      } else onbAnswers[q.id] = [opt.id];
      render();
    }));
  });
  s.append(spacer(true));
  const isLast = onbIndex === model.questions.length - 1;
  const nav = h('div', { class: 'between' });
  nav.append(
    onbIndex > 0 ? button('Back', () => { onbIndex--; render(); }, 'ghost inline') : h('span'),
    button(isLast ? 'See results' : 'Next', () => {
      if (isLast) onbPhase = 'result';
      else onbIndex++;
      render();
    }, 'inline', selected.length === 0),
  );
  s.append(nav);
  return s;
}

/* ----------------------------- home ----------------------------- */

let dailyQuestionId: string | null = null;

function screenHome(): HTMLElement {
  const s = h('div', { class: 'screen' });
  const head = h('div', { class: 'between' });
  head.append(h('div', {}, label('Compass'), t('h1', '', 'Where are you today?')),
    button('Settings', () => open('Settings'), 'ghost inline'));
  s.append(head, spacer());

  // insight
  const insights = filterByCooldown(detectRecurrences(state.patternEvents), state.insightLog);
  if (insights.length) {
    const top = insights[0];
    const def = patternDef(top.tag);
    state.insightLog[top.tag] = now();
    save();
    const card = h('div', { class: 'card' });
    card.append(label('A pattern to notice'), spacer(),
      h('p', {}, formatInsight(top, def?.label ?? top.tag, def?.supportiveNote)),
      small('Noticing it is the point — no pressure to fix it today.'),
      button('Sit with this', () => go('Journal'), 'secondary'));
    s.append(card);
  }

  // daily question
  const recent = state.questionHistory.slice(0, appConfig.questionSelection.recentMemory);
  if (!dailyQuestionId) {
    const q = selectQuestion(appContent.questionBank.questions, { patternTags: state.patternTags, recentlyServedIds: recent });
    dailyQuestionId = q?.id ?? null;
  }
  const dq = appContent.questionBank.questions.find((x) => x.id === dailyQuestionId);
  const qc = h('div', { class: 'card' });
  qc.append(label('A question worth your honesty'), spacer(),
    t('h3', '', dq?.text ?? 'Loading…'));
  const qrow = h('div', { class: 'row' });
  qrow.append(button('Journal on this', () => go('Journal'), 'inline'),
    button('Another', () => {
      if (dailyQuestionId) { state.questionHistory.unshift(dailyQuestionId); save(); }
      const q = selectQuestion(appContent.questionBank.questions, {
        patternTags: state.patternTags,
        recentlyServedIds: state.questionHistory.slice(0, appConfig.questionSelection.recentMemory),
      });
      dailyQuestionId = q?.id ?? null;
      render();
    }, 'ghost inline'));
  qc.append(qrow);
  s.append(qc);

  s.append(t('h2', '', 'Do something with it'));
  const link = (title: string, sub: string, fn: () => void) => {
    const c = h('div', { class: 'card tappable', onClick: fn });
    c.append(h('p', {}, title), muted(sub));
    return c;
  };
  s.append(
    link('Start a coaching session', 'A short, branching conversation that ends in one concrete next step.', () => go('Coaching')),
    link('Open the toolkit', 'Thought records, the distortion check, and values work.', () => go('Toolkit')),
    link("Track how you're doing", 'Log a mood, tag a theme, keep your quests moving.', () => go('Progress')),
    small('Compass is a self-reflection tool, not therapy or care. If things feel heavy, reaching out to a trusted person or a mental-health professional is a strong move.'),
  );
  return s;
}

/* ----------------------------- coaching ----------------------------- */

let flowSession: FlowSessionState | null = null;
let flowReflection = '';
let flowQuestAdded = false;

function screenCoaching(): HTMLElement {
  const s = h('div', { class: 'screen' });
  s.append(label('Coaching'), t('h1', '', 'Pick something to work through'), spacer(),
    muted('Short, honest conversations. Each one branches on your answers and ends with a single small step — not a lecture.'), spacer());
  appContent.flows.forEach((flow) => {
    const c = h('div', { class: 'card tappable', onClick: () => open('FlowPlayer', { flowId: flow.id }) });
    const head = h('div', { class: 'between' });
    head.append(h('p', {}, flow.title), t('span', 'small', `${flow.estMinutes} min`));
    c.append(head, muted(flow.description));
    s.append(c);
  });
  return s;
}

function screenFlowPlayer(flowId: string): HTMLElement {
  const flow = appContent.flows.find((f) => f.id === flowId)!;
  if (!flowSession || flowSession.flowId !== flowId) {
    flowSession = startFlow(flow);
    flowReflection = '';
    flowQuestAdded = false;
  }
  const s = h('div', { class: 'screen' });
  const session = flowSession;

  if (session.finished && session.action) {
    const action = session.action;
    // persist once
    if (!(session as any)._saved) {
      (session as any)._saved = true;
      addPatternEvents(collectedPatternTags(session), 'flow');
      save();
    }
    s.append(label('Your next step'), spacer(), t('h1', '', action.title), spacer());
    const c = h('div', { class: 'card' });
    c.append(h('p', {}, action.description));
    s.append(c, muted("One small step beats a perfect plan you never start. You don't have to do it perfectly — just start."), spacer());
    if (flowQuestAdded) {
      const done = h('div', { class: 'card' });
      done.append(h('p', {}, 'Added to your quests.'), muted("You'll find it under Progress → Quests."));
      s.append(done);
    } else {
      s.append(button('Add this as a quest', () => {
        state.quests.unshift({ id: uid(), questId: null, title: action.title, description: action.description, cadence: 'once', checkins: [] });
        save();
        flowQuestAdded = true;
        render();
      }));
    }
    s.append(button('Done', () => { flowSession = null; back(); }, 'secondary'));
    return s;
  }

  const node = getNode(flow, session.currentNodeId)!;
  s.append(label(flow.title), spacer());
  if (node.type === 'reframe') {
    const c = h('div', { class: 'card' });
    c.append(label('Consider this'), spacer(), t('h3', '', node.text));
    s.append(c);
  } else s.append(t('h2', '', node.text));
  s.append(spacer());

  if (node.type === 'choice') {
    (node.options ?? []).forEach((opt) => {
      s.append(button(opt.label, () => {
        flowSession = advance(flow, session, { kind: 'choice', optionId: opt.id });
        render();
      }, 'secondary'));
    });
  } else if (node.type === 'reflection') {
    const ta = h('textarea', { placeholder: node.capture?.placeholder ?? 'Take your time…' }) as HTMLTextAreaElement;
    ta.value = flowReflection;
    ta.addEventListener('input', () => (flowReflection = ta.value));
    s.append(ta, small('Private to this browser.'),
      button('Continue', () => {
        checkCrisis(flowReflection);
        flowSession = advance(flow, session, { kind: 'reflection', text: flowReflection });
        flowReflection = '';
        render();
      }));
  } else {
    s.append(button('Continue', () => {
      flowSession = advance(flow, session, { kind: 'next' });
      render();
    }));
  }

  const tags = collectedPatternTags(session);
  if (tags.length) {
    const row = h('div', { class: 'pillbar' });
    row.append(spacer());
    tags.forEach((tg) => row.append(chip(tg.replace(/_/g, ' '), false)));
    s.append(row);
  }
  return s;
}

/* ----------------------------- toolkit ----------------------------- */

function screenToolkit(): HTMLElement {
  const s = h('div', { class: 'screen' });
  s.append(label('Toolkit'), t('h1', '', 'Work with a thought'), spacer(),
    muted('Structured exercises informed by public cognitive behavioral frameworks. For self-reflection and learning — not therapy or care.'), spacer());
  const link = (title: string, sub: string, fn: () => void) => {
    const c = h('div', { class: 'card tappable', onClick: fn });
    c.append(h('p', {}, title), muted(sub));
    return c;
  };
  s.append(
    link('Thought record', 'Walk a stuck thought through evidence and land on a more balanced one.', () => open('ThoughtRecord')),
    link('Spot the distortion', `Name the thinking trap and get a pre-written reframe. ${appContent.distortions.distortions.length} common ones.`, () => open('Distortion')),
    link('Values check', 'Reconnect a decision to what actually matters to you.', () => open('ValuesCheck')),
    small(appContent.distortions.frameworkNote),
  );
  return s;
}

let distThought = '';
let distSelected: string[] = [];
function screenDistortion(): HTMLElement {
  const s = h('div', { class: 'screen' });
  s.append(label('Spot the distortion'), t('h1', '', "What's the thought?"), spacer(),
    muted('Write it as it actually sounds in your head — blunt is fine.'), spacer());
  const ta = h('textarea', { placeholder: 'e.g. I always mess these things up.' }) as HTMLTextAreaElement;
  ta.value = distThought;
  ta.style.minHeight = '80px';
  ta.addEventListener('input', () => (distThought = ta.value));
  s.append(ta, spacer(), t('h3', '', 'Which traps are in there?'), muted('Pick any that fit.'), spacer());
  appContent.distortions.distortions.forEach((d) => {
    s.append(chip(d.name, distSelected.includes(d.id), () => {
      distSelected = distSelected.includes(d.id) ? distSelected.filter((x) => x !== d.id) : [...distSelected, d.id];
      render();
    }));
  });
  appContent.distortions.distortions.filter((d) => distSelected.includes(d.id)).forEach((d) => {
    const c = h('div', { class: 'card' });
    c.append(h('p', {}, d.name), muted(d.description), small('Example: ' + d.example), h('div', { class: 'divider' }), label('Try reframing'), spacer());
    d.reframePrompts.forEach((p) => c.append(muted('• ' + p)));
    c.append(h('p', { class: 'accent' }, d.reframeTemplate), small('Source: ' + d.citation));
    s.append(c);
  });
  if (distSelected.length && distThought.trim()) {
    s.append(button('Save this', () => {
      checkCrisis(distThought);
      state.thoughtRecords.unshift({ at: now(), automaticThought: distThought, distortions: distSelected, reframe: appContent.distortions.distortions.filter((d) => distSelected.includes(d.id)).map((d) => d.reframeTemplate).join('\n\n') });
      save();
      distThought = ''; distSelected = [];
      alert('Saved to this browser.');
      back();
    }));
  }
  s.append(small('A self-reflection exercise, not a diagnosis of any condition.'));
  return s;
}

const tr = { situation: '', thought: '', evFor: '', evAgainst: '', distortions: [] as string[], reframe: '', outcome: '' };
function screenThoughtRecord(): HTMLElement {
  const s = h('div', { class: 'screen' });
  s.append(label('Thought record'), t('h1', '', 'Slow the thought down'), spacer());
  const field = (lab: string, hint: string, key: keyof typeof tr) => {
    const wrap = h('div', {});
    wrap.append(label(lab), muted(hint));
    const ta = h('textarea') as HTMLTextAreaElement;
    ta.style.minHeight = '70px';
    ta.value = tr[key] as string;
    ta.addEventListener('input', () => ((tr[key] as string) = ta.value));
    wrap.append(ta, spacer());
    return wrap;
  };
  s.append(field('Situation', 'What happened, factually?', 'situation'));
  s.append(field('Automatic thought', 'What went through your mind?', 'thought'));
  s.append(label('Any thinking traps?'), muted('Optional — tagging shows a reframe you can borrow.'), spacer());
  appContent.distortions.distortions.forEach((d) => {
    s.append(chip(d.name, tr.distortions.includes(d.id), () => {
      tr.distortions = tr.distortions.includes(d.id) ? tr.distortions.filter((x) => x !== d.id) : [...tr.distortions, d.id];
      render();
    }));
  });
  appContent.distortions.distortions.filter((d) => tr.distortions.includes(d.id)).forEach((d) => {
    const c = h('div', { class: 'card' });
    c.append(small(d.name), h('p', { class: 'accent' }, d.reframeTemplate));
    s.append(c);
  });
  s.append(spacer());
  s.append(field('Evidence it’s true', 'Be fair — what genuinely supports it?', 'evFor'));
  s.append(field('Evidence against', 'What would you tell a friend who said this?', 'evAgainst'));
  s.append(field('A more balanced thought', 'Not fake-positive — just truer.', 'reframe'));
  s.append(field('What now?', 'One small thing you can do differently.', 'outcome'));
  s.append(button('Save', () => {
    checkCrisis([tr.situation, tr.thought, tr.evFor, tr.evAgainst, tr.reframe, tr.outcome].join(' '));
    state.thoughtRecords.unshift({ at: now(), automaticThought: tr.thought, distortions: tr.distortions, reframe: tr.reframe });
    save();
    Object.assign(tr, { situation: '', thought: '', evFor: '', evAgainst: '', distortions: [], reframe: '', outcome: '' });
    alert('Saved to this browser.');
    back();
  }, '', tr.thought.trim().length === 0));
  return s;
}

let vcSelected: string[] = [];
let vcReflection = '';
function screenValuesCheck(): HTMLElement {
  const s = h('div', { class: 'screen' });
  s.append(label('Values check'), t('h1', '', 'What actually matters here?'), spacer(),
    muted('Pick up to 3 that feel most alive for you right now.'), spacer());
  appContent.valuesModel.valueDimensions.forEach((d) => {
    s.append(chip(d.label, vcSelected.includes(d.id), () => {
      if (vcSelected.includes(d.id)) vcSelected = vcSelected.filter((x) => x !== d.id);
      else if (vcSelected.length < 3) vcSelected = [...vcSelected, d.id];
      render();
    }));
  });
  if (vcSelected.length) {
    const c = h('div', { class: 'card' });
    appContent.valuesModel.valueDimensions.filter((d) => vcSelected.includes(d.id)).forEach((d) => {
      c.append(h('p', {}, d.label), muted(d.description));
    });
    s.append(c, t('h3', '', "Where are you honoring these — and where aren't you?"), muted('Be specific.'), spacer());
    const ta = h('textarea', { placeholder: 'This week, I…' }) as HTMLTextAreaElement;
    ta.value = vcReflection;
    ta.addEventListener('input', () => (vcReflection = ta.value));
    s.append(ta, button('Save', () => {
      checkCrisis(vcReflection);
      const header = appContent.valuesModel.valueDimensions.filter((d) => vcSelected.includes(d.id)).map((d) => d.label).join(', ');
      state.journal.unshift({ at: now(), promptId: 'values-clarification', body: `Values: ${header}\n\n${vcReflection}`, tags: [] });
      save();
      vcSelected = []; vcReflection = '';
      alert('Saved to your journal.');
      back();
    }, '', vcReflection.trim().length === 0));
  }
  return s;
}

/* ----------------------------- journal ----------------------------- */

let journalPromptId: string | null = null;
let journalBody = '';
let journalTags: string[] = [];

function screenJournal(): HTMLElement {
  const s = h('div', { class: 'screen' });
  const recent = state.questionHistory.slice(0, appConfig.questionSelection.recentMemory);
  if (!journalPromptId) {
    const p = selectQuestion(appContent.journalPrompts.prompts as any, { patternTags: state.patternTags, recentlyServedIds: recent });
    journalPromptId = p?.id ?? null;
  }
  const prompt = appContent.journalPrompts.prompts.find((p) => p.id === journalPromptId);
  s.append(label('Journal'), t('h1', '', 'Write it out'), spacer());
  const pc = h('div', { class: 'card' });
  pc.append(label('Prompt'), spacer(), t('h3', '', prompt?.text ?? 'Loading…'),
    button('Different prompt', () => {
      if (journalPromptId) { state.questionHistory.unshift(journalPromptId); save(); }
      const p = selectQuestion(appContent.journalPrompts.prompts as any, {
        patternTags: state.patternTags,
        recentlyServedIds: state.questionHistory.slice(0, appConfig.questionSelection.recentMemory),
      });
      journalPromptId = p?.id ?? null;
      render();
    }, 'ghost inline'));
  s.append(pc);

  const ta = h('textarea', { placeholder: 'No filter needed here.' }) as HTMLTextAreaElement;
  ta.style.minHeight = '150px';
  ta.value = journalBody;
  ta.addEventListener('input', () => (journalBody = ta.value));
  s.append(ta, spacer(), label('Tag a theme (optional)'), muted('Tagging helps Compass gently notice what keeps coming up.'), spacer());
  appContent.valuesModel.patternTags.forEach((tag) => {
    s.append(chip(tag.label, journalTags.includes(tag.id), () => {
      journalTags = journalTags.includes(tag.id) ? journalTags.filter((x) => x !== tag.id) : [...journalTags, tag.id];
      render();
    }));
  });
  s.append(
    button('Save entry', () => {
      checkCrisis(journalBody);
      state.journal.unshift({ at: now(), promptId: journalPromptId, body: journalBody, tags: journalTags });
      if (journalTags.length) addPatternEvents(journalTags, 'journal');
      save();
      journalBody = ''; journalTags = [];
      alert('Entry saved to this browser.');
      render();
    }, '', journalBody.trim().length === 0),
    button('See past entries', () => open('JournalList'), 'ghost'),
    small('Everything you write stays in this browser.'),
  );
  return s;
}

function screenJournalList(): HTMLElement {
  const s = h('div', { class: 'screen' });
  s.append(label('Journal'), t('h1', '', 'Past entries'), spacer());
  if (!state.journal.length) s.append(muted('Nothing here yet. Your entries will show up as you write them.'));
  state.journal.forEach((e) => {
    const c = h('div', { class: 'card' });
    c.append(small(new Date(e.at).toLocaleDateString()), spacer(), h('p', {}, e.body || '(empty)'),
      e.tags.length ? small('Themes: ' + e.tags.join(', ')) : null);
    s.append(c);
  });
  return s;
}

/* ----------------------------- progress + quests ----------------------------- */

const MOOD_LABELS: Record<number, string> = { 1: 'Rough', 2: 'Low', 3: 'Okay', 4: 'Good', 5: 'Great' };
let moodPick: number | null = null;
let moodTags: string[] = [];

function screenProgress(): HTMLElement {
  const s = h('div', { class: 'screen' });
  s.append(label('Progress'), t('h1', '', 'How are you, honestly?'), spacer());

  const mc = h('div', { class: 'card' });
  mc.append(label('Log a mood'), spacer());
  [1, 2, 3, 4, 5].forEach((m) => mc.append(chip(MOOD_LABELS[m], moodPick === m, () => { moodPick = m; render(); })));
  mc.append(small("Tag what's driving it (optional):"));
  appContent.valuesModel.patternTags.forEach((tag) => {
    mc.append(chip(tag.label, moodTags.includes(tag.id), () => {
      moodTags = moodTags.includes(tag.id) ? moodTags.filter((x) => x !== tag.id) : [...moodTags, tag.id];
      render();
    }));
  });
  mc.append(button('Save', () => {
    if (moodPick == null) return;
    state.moodLogs.unshift({ at: now(), mood: moodPick, tags: moodTags });
    if (moodTags.length) addPatternEvents(moodTags, 'mood');
    save();
    moodPick = null; moodTags = [];
    render();
  }, '', moodPick == null));
  s.append(mc);

  if (state.moodLogs.length) {
    const rc = h('div', { class: 'card' });
    rc.append(label('Recent moods'), spacer());
    const row = h('div', { class: 'pillbar' });
    state.moodLogs.slice(0, 7).forEach((r) => row.append(t('span', 'pill', MOOD_LABELS[r.mood] ?? String(r.mood))));
    rc.append(row, small("No judgement in these — they're just information."));
    s.append(rc);
  }

  s.append(t('h2', '', 'What keeps coming up'));
  const counts = detectRecurrences(state.patternEvents, { minOccurrences: 1 });
  if (!counts.length) s.append(muted(`Nothing tagged in the last ${appConfig.patterns.windowDays} days yet.`));
  else {
    const c = h('div', { class: 'card' });
    counts.forEach((ct, i) => {
      const def = patternDef(ct.tag);
      if (i > 0) c.append(h('div', { class: 'divider' }));
      const row = h('div', { class: 'between' });
      row.append(h('p', {}, def?.label ?? ct.tag), t('span', 'small', ct.count + '×'));
      c.append(row);
      if (ct.count >= appConfig.patterns.minOccurrences && def?.supportiveNote) c.append(t('p', 'accent', def.supportiveNote));
    });
    s.append(c);
  }

  s.append(button('Your quests', () => open('Quests'), 'secondary'),
    small('Counting, not diagnosing. If a theme feels heavier than an app can hold, a trusted person or a mental-health professional is worth reaching for.'));
  return s;
}

function screenQuests(): HTMLElement {
  const s = h('div', { class: 'screen' });
  s.append(label('Quests'), t('h1', '', 'Small moves'), spacer(),
    muted('Reflection is only worth something if it changes a next step. Keep these tiny.'), spacer());

  if (!state.quests.length) s.append(muted('No active quests yet. Add one below, or finish a coaching session to create one.'));
  state.quests.forEach((q) => {
    const src = appContent.quests.quests.find((x) => x.id === q.questId);
    const enc = src?.encouragement ?? 'Showing up at all counts. Come back whenever you can.';
    const prog = questProgress(q.checkins);
    const c = h('div', { class: 'card' });
    c.append(h('p', {}, q.title), muted(q.description), spacer(),
      small(`${prog.completed} done · ${prog.totalCheckIns} check-ins · ${q.cadence}`), small(enc),
      h('div', { class: 'divider' }));
    const row = h('div', { class: 'btnrow' });
    const chk = (status: CheckIn['status'], lab: string, variant: string) =>
      button(lab, () => { q.checkins.unshift({ at: now(), status }); save(); render(); }, variant + ' inline');
    row.append(chk('done', 'Did it', ''), chk('partial', 'Some of it', 'secondary'), chk('skipped', 'Not today', 'ghost'));
    c.append(row, button('Retire this quest', () => {
      state.quests = state.quests.filter((x) => x.id !== q.id);
      save(); render();
    }, 'ghost'));
    s.append(c);
  });

  const activeIds = state.quests.map((q) => q.questId).filter(Boolean) as string[];
  const suggestions = suggestQuests(appContent.quests.quests, { patterns: state.patternTags, excludeIds: activeIds }, 3);
  if (suggestions.length) {
    s.append(t('h2', '', 'Suggested for you'), muted('Chosen to match the patterns you’ve been flagging.'), spacer());
    suggestions.forEach((q) => {
      const c = h('div', { class: 'card' });
      c.append(h('p', {}, q.title), muted(q.description), small(`~${q.estMinutes} min · ${q.cadence}`),
        button('Add to my quests', () => {
          state.quests.unshift({ id: uid(), questId: q.id, title: q.title, description: q.description, cadence: q.cadence, checkins: [] });
          save(); render();
        }, 'secondary'));
      s.append(c);
    });
  }
  return s;
}

/* ----------------------------- settings ----------------------------- */

function screenSettings(): HTMLElement {
  const s = h('div', { class: 'screen' });
  s.append(label('Settings'), t('h1', '', 'Compass'), spacer());

  const support = h('div', { class: 'card' });
  support.append(label('If you need support now'), spacer(), muted('Crisis lines and a reminder that reaching out is a strength.'),
    button('Get support resources', () => { overlay = 'crisis'; render(); }));
  s.append(support);

  s.append(t('h2', '', 'Your documents'));
  const doc = (title: string, sub: string, d: 'disclaimer' | 'terms' | 'privacy') => {
    const c = h('div', { class: 'card tappable', onClick: () => { overlay = { doc: d }; render(); } });
    c.append(h('p', {}, title), sub ? muted(sub) : null);
    return c;
  };
  s.append(doc('Disclaimer', "What Compass is and isn't.", 'disclaimer'),
    doc('Privacy policy', 'Short version: your data stays in this browser.', 'privacy'),
    doc('Terms of service', '', 'terms'));

  s.append(t('h2', '', 'Crisis-resource region'), muted("Which region's placeholder crisis lines to show."), spacer());
  appContent.crisisResources.regions.forEach((r) => {
    s.append(chip(r.label, state.settings.crisisRegion === r.code, () => {
      state.settings.crisisRegion = r.code; save(); render();
    }));
  });

  s.append(t('h2', '', 'About'));
  const about = h('div', { class: 'card' });
  about.append(h('p', {}, appConfig.appName), muted('A deterministic, on-device self-reflection tool. No AI, no account, no server, no analytics. Nothing you write is transmitted anywhere.'),
    small(`Minimum age: ${appConfig.minimumAge}+ · Content is fully offline and editable.`));
  s.append(about);

  s.append(t('h2', '', 'Your data'));
  const data = h('div', { class: 'card' });
  data.append(h('p', {}, 'Erase everything in this browser'),
    muted('Permanently deletes every reflection, entry, mood, quest, and answer stored locally.'),
    h('div', { class: 'divider' }),
    button('Erase all my data', () => {
      if (confirm('Permanently erase all Compass data in this browser? This cannot be undone.')) {
        state = freshState();
        save();
        activeTab = 'Home'; detail = null;
        render();
      }
    }, 'secondary'));
  s.append(data);

  s.append(small('The disclaimer, Terms, and Privacy Policy are placeholders pending review by a licensed attorney. Compass is not therapy, medical, or mental-health care.'));
  return s;
}

/* ----------------------------- crisis overlay ----------------------------- */

function overlayCrisis(): HTMLElement {
  const res = appContent.crisisResources;
  const region = res.regions.find((r) => r.code === state.settings.crisisRegion) ?? res.regions[0];
  const o = h('div', { class: 'overlay' });
  const inner = h('div', { class: 'inner' });
  inner.append(label("You're not alone in this"), spacer(),
    t('h1', '', 'It sounds like things are really heavy right now.'), spacer(),
    h('p', {}, res.globalNote), spacer(),
    muted("Compass isn't the right tool for this moment, and that's okay. Please consider reaching out to one of the lines below, a mental-health professional, or someone you trust. You deserve real support from a real person."), spacer(true));
  if (region) {
    inner.append(label(region.label), spacer());
    region.lines.forEach((line) => {
      const c = h('div', { class: 'line' });
      c.append(h('p', {}, line.name), line.hours ? small(line.hours) : null);
      const row = h('div', { class: 'row' });
      if (line.number) row.append(h('a', { class: 'calltag', href: `tel:${line.number}` }, `Call ${line.number}`));
      if (line.sms) row.append(h('a', { class: 'calltag', href: `sms:${line.sms}` }, `Text ${line.sms}`));
      if (line.url) row.append(h('a', { class: 'calltag', href: line.url, target: '_blank', rel: 'noreferrer' }, 'Open'));
      c.append(row, line.note ? small(line.note) : null);
      inner.append(c);
    });
  }
  inner.append(spacer(true), button('Okay — close this', () => { overlay = null; render(); }, 'secondary'),
    small('If you are in immediate danger, contact your local emergency number now. These resources are placeholders until localised for your region.'));
  o.append(inner);
  return o;
}

function overlayDoc(d: 'disclaimer' | 'terms' | 'privacy'): HTMLElement {
  const src = d === 'disclaimer' ? disclaimerMarkdown : d === 'terms' ? termsMarkdown : privacyMarkdown;
  const o = h('div', { class: 'overlay' });
  const inner = h('div', { class: 'inner' });
  inner.append(tinyMarkdown(src), spacer(true), button('Close', () => { overlay = null; render(); }, 'secondary'));
  o.append(inner);
  return o;
}

/* ----------------------------- render ----------------------------- */

function tabbar(): HTMLElement {
  const bar = h('div', { class: 'tabbar' });
  (['Home', 'Coaching', 'Toolkit', 'Journal', 'Progress'] as const).forEach((name) => {
    const b = h('button', { class: activeTab === name && !detail ? 'active' : '', onClick: () => go(name) },
      h('span', { class: 'dot' }), name);
    bar.append(b);
  });
  return bar;
}

function currentScreen(): HTMLElement {
  if (detail) {
    switch (detail.name) {
      case 'FlowPlayer': return screenFlowPlayer(detail.params.flowId);
      case 'ThoughtRecord': return screenThoughtRecord();
      case 'Distortion': return screenDistortion();
      case 'ValuesCheck': return screenValuesCheck();
      case 'JournalList': return screenJournalList();
      case 'Quests': return screenQuests();
      case 'Settings': return screenSettings();
    }
  }
  switch (activeTab) {
    case 'Coaching': return screenCoaching();
    case 'Toolkit': return screenToolkit();
    case 'Journal': return screenJournal();
    case 'Progress': return screenProgress();
    default: return screenHome();
  }
}

function render() {
  root.innerHTML = '';

  if (state.disclaimerAckVersion < appConfig.disclaimerVersion || !state.ageAck) {
    root.append(screenGate());
  } else if (!state.onboarded) {
    root.append(screenOnboarding());
  } else {
    // reset transient detail-entry state when leaving player
    root.append(currentScreen());
    root.append(tabbar());
  }

  if (overlay === 'crisis') root.append(overlayCrisis());
  else if (overlay && typeof overlay === 'object') root.append(overlayDoc(overlay.doc));

  window.scrollTo(0, 0);
}

render();
