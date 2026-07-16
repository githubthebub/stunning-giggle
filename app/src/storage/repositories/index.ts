/**
 * Typed data-access layer over the on-device SQLite database.
 *
 * Every function here awaits getDb() (which also initialises crypto), so all
 * reads/writes are safe. Sensitive free-text is encrypted with encryptString
 * before storage and decrypted with decryptString on read. Nothing in this file
 * performs any network I/O.
 */
import { getDb, newId, nowIso } from '../db';
import { encryptString, decryptString } from '../crypto';
import type { ValuesProfile } from '../../features/onboarding/scoring';
import type { PatternEvent } from '../../features/patterns/detector';
import type { CheckIn } from '../../features/quests/engine';

function toJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}
function fromJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/* ------------------------------------------------------------------ */
/* Profile / gating                                                   */
/* ------------------------------------------------------------------ */

export type Profile = {
  createdAt: string;
  onboarded: boolean;
  ageAck: boolean;
  ageConfirmedAt: string | null;
  disclaimerAckVersion: number;
  termsAckVersion: number;
  privacyAckVersion: number;
  valuesProfile: ValuesProfile | null;
  patternTags: string[];
  settings: Record<string, unknown>;
};

type ProfileRow = {
  created_at: string;
  onboarded: number;
  age_ack: number;
  age_confirmed_at: string | null;
  disclaimer_ack_version: number;
  terms_ack_version: number;
  privacy_ack_version: number;
  values_profile: string | null;
  pattern_tags: string | null;
  settings: string | null;
};

export async function getProfile(): Promise<Profile> {
  const db = await getDb();
  const row = await db.getFirstAsync<ProfileRow>(`SELECT * FROM user_profile WHERE id = 1;`);
  return {
    createdAt: row?.created_at ?? nowIso(),
    onboarded: !!row?.onboarded,
    ageAck: !!row?.age_ack,
    ageConfirmedAt: row?.age_confirmed_at ?? null,
    disclaimerAckVersion: row?.disclaimer_ack_version ?? 0,
    termsAckVersion: row?.terms_ack_version ?? 0,
    privacyAckVersion: row?.privacy_ack_version ?? 0,
    valuesProfile: fromJson<ValuesProfile | null>(row?.values_profile, null),
    patternTags: fromJson<string[]>(row?.pattern_tags, []),
    settings: fromJson<Record<string, unknown>>(row?.settings, {}),
  };
}

export async function confirmAge(): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE user_profile SET age_ack = 1, age_confirmed_at = ? WHERE id = 1;`,
    [nowIso()],
  );
}

export async function acknowledgeDisclaimer(version: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE user_profile SET disclaimer_ack_version = ? WHERE id = 1;`, [version]);
}

export async function acknowledgeLegal(termsVersion: number, privacyVersion: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE user_profile SET terms_ack_version = ?, privacy_ack_version = ? WHERE id = 1;`,
    [termsVersion, privacyVersion],
  );
}

export async function completeOnboarding(
  valuesProfile: ValuesProfile,
  patternTags: string[],
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE user_profile SET onboarded = 1, values_profile = ?, pattern_tags = ? WHERE id = 1;`,
    [toJson(valuesProfile), toJson(patternTags)],
  );
}

export async function updateSettings(settings: Record<string, unknown>): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE user_profile SET settings = ? WHERE id = 1;`, [toJson(settings)]);
}

/* ------------------------------------------------------------------ */
/* Assessments                                                        */
/* ------------------------------------------------------------------ */

export async function saveAssessment(
  answers: Record<string, string[]>,
  derived: ValuesProfile,
): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    `INSERT INTO assessments (id, taken_at, answers_enc, derived_profile) VALUES (?, ?, ?, ?);`,
    [id, nowIso(), encryptString(toJson(answers)), toJson(derived)],
  );
  return id;
}

/* ------------------------------------------------------------------ */
/* Mood + pattern events                                              */
/* ------------------------------------------------------------------ */

export type MoodLog = {
  id: string;
  loggedAt: string;
  mood: number;
  note: string;
  tags: string[];
};

export async function logMood(mood: number, note: string, tags: string[]): Promise<string> {
  const db = await getDb();
  const id = newId();
  const at = nowIso();
  await db.runAsync(
    `INSERT INTO mood_logs (id, logged_at, mood, note_enc, tags) VALUES (?, ?, ?, ?, ?);`,
    [id, at, mood, encryptString(note), toJson(tags)],
  );
  if (tags.length) await addPatternEvents(tags, 'mood', id);
  return id;
}

export async function recentMoods(limit = 30): Promise<MoodLog[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    logged_at: string;
    mood: number;
    note_enc: string | null;
    tags: string | null;
  }>(`SELECT * FROM mood_logs ORDER BY logged_at DESC LIMIT ?;`, [limit]);
  return rows.map((r) => ({
    id: r.id,
    loggedAt: r.logged_at,
    mood: r.mood,
    note: decryptString(r.note_enc),
    tags: fromJson<string[]>(r.tags, []),
  }));
}

export async function addPatternEvents(
  tags: string[],
  source: string,
  refId?: string,
): Promise<void> {
  const db = await getDb();
  const at = nowIso();
  for (const tag of tags) {
    await db.runAsync(
      `INSERT INTO pattern_events (id, created_at, tag, source, ref_id) VALUES (?, ?, ?, ?, ?);`,
      [newId(), at, tag, source, refId ?? null],
    );
  }
}

export async function allPatternEvents(): Promise<PatternEvent[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ tag: string; created_at: string; source: string | null }>(
    `SELECT tag, created_at, source FROM pattern_events ORDER BY created_at DESC;`,
  );
  return rows.map((r) => ({ tag: r.tag, at: r.created_at, source: r.source ?? undefined }));
}

/* ------------------------------------------------------------------ */
/* Journal                                                            */
/* ------------------------------------------------------------------ */

export type JournalEntry = {
  id: string;
  createdAt: string;
  promptId: string | null;
  body: string;
  tags: string[];
};

export async function addJournalEntry(
  promptId: string | null,
  body: string,
  tags: string[],
): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    `INSERT INTO journal_entries (id, created_at, prompt_id, body_enc, tags) VALUES (?, ?, ?, ?, ?);`,
    [id, nowIso(), promptId, encryptString(body), toJson(tags)],
  );
  if (tags.length) await addPatternEvents(tags, 'journal', id);
  return id;
}

export async function listJournalEntries(limit = 100): Promise<JournalEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    created_at: string;
    prompt_id: string | null;
    body_enc: string | null;
    tags: string | null;
  }>(`SELECT * FROM journal_entries ORDER BY created_at DESC LIMIT ?;`, [limit]);
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    promptId: r.prompt_id,
    body: decryptString(r.body_enc),
    tags: fromJson<string[]>(r.tags, []),
  }));
}

/* ------------------------------------------------------------------ */
/* Thought records (CBT)                                              */
/* ------------------------------------------------------------------ */

export type ThoughtRecord = {
  id: string;
  createdAt: string;
  situation: string;
  automaticThought: string;
  evidenceFor: string;
  evidenceAgainst: string;
  distortions: string[];
  reframe: string;
  outcome: string;
};

export async function addThoughtRecord(
  record: Omit<ThoughtRecord, 'id' | 'createdAt'>,
): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    `INSERT INTO thought_records
       (id, created_at, situation_enc, automatic_thought_enc, evidence_for_enc,
        evidence_against_enc, distortions, reframe_enc, outcome_enc)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      nowIso(),
      encryptString(record.situation),
      encryptString(record.automaticThought),
      encryptString(record.evidenceFor),
      encryptString(record.evidenceAgainst),
      toJson(record.distortions),
      encryptString(record.reframe),
      encryptString(record.outcome),
    ],
  );
  return id;
}

export async function listThoughtRecords(limit = 100): Promise<ThoughtRecord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    created_at: string;
    situation_enc: string | null;
    automatic_thought_enc: string | null;
    evidence_for_enc: string | null;
    evidence_against_enc: string | null;
    distortions: string | null;
    reframe_enc: string | null;
    outcome_enc: string | null;
  }>(`SELECT * FROM thought_records ORDER BY created_at DESC LIMIT ?;`, [limit]);
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    situation: decryptString(r.situation_enc),
    automaticThought: decryptString(r.automatic_thought_enc),
    evidenceFor: decryptString(r.evidence_for_enc),
    evidenceAgainst: decryptString(r.evidence_against_enc),
    distortions: fromJson<string[]>(r.distortions, []),
    reframe: decryptString(r.reframe_enc),
    outcome: decryptString(r.outcome_enc),
  }));
}

/* ------------------------------------------------------------------ */
/* Flow sessions                                                      */
/* ------------------------------------------------------------------ */

export async function saveFlowSession(params: {
  flowId: string;
  startedAt: string;
  path: unknown;
  collectedTags: string[];
  actionTitle: string | null;
  actionDescription: string | null;
}): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    `INSERT INTO flow_sessions
       (id, flow_id, started_at, completed_at, path_enc, collected_tags, action_title, action_description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      params.flowId,
      params.startedAt,
      nowIso(),
      encryptString(toJson(params.path)),
      toJson(params.collectedTags),
      params.actionTitle,
      params.actionDescription,
    ],
  );
  if (params.collectedTags.length) await addPatternEvents(params.collectedTags, 'flow', id);
  return id;
}

export type FlowSessionSummary = {
  id: string;
  flowId: string;
  completedAt: string | null;
  actionTitle: string | null;
  actionDescription: string | null;
};

export async function listFlowSessions(limit = 50): Promise<FlowSessionSummary[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    flow_id: string;
    completed_at: string | null;
    action_title: string | null;
    action_description: string | null;
  }>(
    `SELECT id, flow_id, completed_at, action_title, action_description
       FROM flow_sessions ORDER BY started_at DESC LIMIT ?;`,
    [limit],
  );
  return rows.map((r) => ({
    id: r.id,
    flowId: r.flow_id,
    completedAt: r.completed_at,
    actionTitle: r.action_title,
    actionDescription: r.action_description,
  }));
}

/* ------------------------------------------------------------------ */
/* Quests                                                             */
/* ------------------------------------------------------------------ */

export type ActiveQuest = {
  id: string;
  questId: string | null;
  title: string;
  description: string;
  cadence: string;
  createdAt: string;
  active: boolean;
  custom: boolean;
};

export async function addActiveQuest(params: {
  questId: string | null;
  title: string;
  description: string;
  cadence: string;
  custom?: boolean;
}): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    `INSERT INTO active_quests (id, quest_id, title, description, cadence, created_at, active, custom)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?);`,
    [id, params.questId, params.title, params.description, params.cadence, nowIso(), params.custom ? 1 : 0],
  );
  return id;
}

export async function listActiveQuests(): Promise<ActiveQuest[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    quest_id: string | null;
    title: string;
    description: string | null;
    cadence: string;
    created_at: string;
    active: number;
    custom: number;
  }>(`SELECT * FROM active_quests WHERE active = 1 ORDER BY created_at DESC;`);
  return rows.map((r) => ({
    id: r.id,
    questId: r.quest_id,
    title: r.title,
    description: r.description ?? '',
    cadence: r.cadence,
    createdAt: r.created_at,
    active: !!r.active,
    custom: !!r.custom,
  }));
}

export async function deactivateQuest(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE active_quests SET active = 0 WHERE id = ?;`, [id]);
}

export async function addCheckIn(
  activeQuestId: string,
  status: CheckIn['status'],
  note = '',
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO quest_checkins (id, active_quest_id, at, status, note_enc) VALUES (?, ?, ?, ?, ?);`,
    [newId(), activeQuestId, nowIso(), status, encryptString(note)],
  );
}

export async function checkInsFor(activeQuestId: string): Promise<CheckIn[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ at: string; status: string; note_enc: string | null }>(
    `SELECT at, status, note_enc FROM quest_checkins WHERE active_quest_id = ? ORDER BY at DESC;`,
    [activeQuestId],
  );
  return rows.map((r) => ({
    at: r.at,
    status: r.status as CheckIn['status'],
    note: decryptString(r.note_enc),
  }));
}

/* ------------------------------------------------------------------ */
/* Question history + insight cooldown                                */
/* ------------------------------------------------------------------ */

export async function recordQuestionServed(questionId: string, topic?: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO question_history (id, question_id, served_at, topic) VALUES (?, ?, ?, ?);`,
    [newId(), questionId, nowIso(), topic ?? null],
  );
}

export async function recentQuestionIds(limit = 24): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ question_id: string }>(
    `SELECT question_id FROM question_history ORDER BY served_at DESC LIMIT ?;`,
    [limit],
  );
  return rows.map((r) => r.question_id);
}

export async function getLastSurfacedMap(): Promise<Record<string, string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ tag: string; last_surfaced_at: string }>(
    `SELECT tag, last_surfaced_at FROM insight_log;`,
  );
  const map: Record<string, string> = {};
  for (const r of rows) map[r.tag] = r.last_surfaced_at;
  return map;
}

export async function markInsightSurfaced(tag: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO insight_log (tag, last_surfaced_at) VALUES (?, ?)
       ON CONFLICT(tag) DO UPDATE SET last_surfaced_at = excluded.last_surfaced_at;`,
    [tag, nowIso()],
  );
}
