/**
 * On-device SQLite database: open + schema migrations.
 *
 * All data lives here, on the device, in the app's private sandbox. There is no
 * server, no sync, no network. Sensitive text columns are encrypted at the
 * repository layer (see crypto.ts) before they reach these tables.
 */
import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { initCrypto } from './crypto';

const DB_NAME = 'compass.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** UUID for new rows. */
export function newId(): string {
  return Crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

const MIGRATIONS: string[] = [
  `PRAGMA journal_mode = WAL;`,

  `CREATE TABLE IF NOT EXISTS user_profile (
     id INTEGER PRIMARY KEY CHECK (id = 1),
     created_at TEXT NOT NULL,
     onboarded INTEGER NOT NULL DEFAULT 0,
     age_ack INTEGER NOT NULL DEFAULT 0,
     age_confirmed_at TEXT,
     disclaimer_ack_version INTEGER NOT NULL DEFAULT 0,
     terms_ack_version INTEGER NOT NULL DEFAULT 0,
     privacy_ack_version INTEGER NOT NULL DEFAULT 0,
     values_profile TEXT,
     pattern_tags TEXT,
     settings TEXT
   );`,

  `CREATE TABLE IF NOT EXISTS assessments (
     id TEXT PRIMARY KEY,
     taken_at TEXT NOT NULL,
     answers_enc TEXT,
     derived_profile TEXT
   );`,

  `CREATE TABLE IF NOT EXISTS mood_logs (
     id TEXT PRIMARY KEY,
     logged_at TEXT NOT NULL,
     mood INTEGER NOT NULL,
     note_enc TEXT,
     tags TEXT
   );`,

  `CREATE TABLE IF NOT EXISTS pattern_events (
     id TEXT PRIMARY KEY,
     created_at TEXT NOT NULL,
     tag TEXT NOT NULL,
     source TEXT,
     ref_id TEXT
   );`,
  `CREATE INDEX IF NOT EXISTS idx_pattern_events_tag ON pattern_events(tag);`,
  `CREATE INDEX IF NOT EXISTS idx_pattern_events_created ON pattern_events(created_at);`,

  `CREATE TABLE IF NOT EXISTS journal_entries (
     id TEXT PRIMARY KEY,
     created_at TEXT NOT NULL,
     prompt_id TEXT,
     body_enc TEXT,
     tags TEXT
   );`,

  `CREATE TABLE IF NOT EXISTS thought_records (
     id TEXT PRIMARY KEY,
     created_at TEXT NOT NULL,
     situation_enc TEXT,
     automatic_thought_enc TEXT,
     evidence_for_enc TEXT,
     evidence_against_enc TEXT,
     distortions TEXT,
     reframe_enc TEXT,
     outcome_enc TEXT
   );`,

  `CREATE TABLE IF NOT EXISTS flow_sessions (
     id TEXT PRIMARY KEY,
     flow_id TEXT NOT NULL,
     started_at TEXT NOT NULL,
     completed_at TEXT,
     path_enc TEXT,
     collected_tags TEXT,
     action_title TEXT,
     action_description TEXT
   );`,

  `CREATE TABLE IF NOT EXISTS goals (
     id TEXT PRIMARY KEY,
     created_at TEXT NOT NULL,
     title TEXT NOT NULL,
     value_ref TEXT
   );`,

  `CREATE TABLE IF NOT EXISTS active_quests (
     id TEXT PRIMARY KEY,
     quest_id TEXT,
     title TEXT NOT NULL,
     description TEXT,
     cadence TEXT NOT NULL,
     created_at TEXT NOT NULL,
     active INTEGER NOT NULL DEFAULT 1,
     custom INTEGER NOT NULL DEFAULT 0,
     goal_id TEXT
   );`,

  `CREATE TABLE IF NOT EXISTS quest_checkins (
     id TEXT PRIMARY KEY,
     active_quest_id TEXT NOT NULL,
     at TEXT NOT NULL,
     status TEXT NOT NULL,
     note_enc TEXT
   );`,
  `CREATE INDEX IF NOT EXISTS idx_checkins_quest ON quest_checkins(active_quest_id);`,

  `CREATE TABLE IF NOT EXISTS question_history (
     id TEXT PRIMARY KEY,
     question_id TEXT NOT NULL,
     served_at TEXT NOT NULL,
     topic TEXT
   );`,

  `CREATE TABLE IF NOT EXISTS insight_log (
     tag TEXT PRIMARY KEY,
     last_surfaced_at TEXT NOT NULL
   );`,

  `CREATE TABLE IF NOT EXISTS content_meta (
     id INTEGER PRIMARY KEY CHECK (id = 1),
     content_version INTEGER NOT NULL DEFAULT 1,
     migrated_at TEXT
   );`,
];

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  for (const statement of MIGRATIONS) {
    await db.execAsync(statement);
  }
  // Ensure the singleton profile row exists.
  await db.runAsync(
    `INSERT OR IGNORE INTO user_profile (id, created_at) VALUES (1, ?);`,
    [nowIso()],
  );
  await db.runAsync(
    `INSERT OR IGNORE INTO content_meta (id, content_version, migrated_at) VALUES (1, 1, ?);`,
    [nowIso()],
  );
}

/**
 * Open (once) the encrypted-at-rest database and initialise crypto. All
 * repositories await this, so crypto is always ready before any read/write.
 */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      await initCrypto();
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await migrate(db);
      return db;
    })();
  }
  return dbPromise;
}

/** Drop all user data (used by the "erase all my data" flow). */
export async function wipeAllData(): Promise<void> {
  const db = await getDb();
  const tables = [
    'assessments',
    'mood_logs',
    'pattern_events',
    'journal_entries',
    'thought_records',
    'flow_sessions',
    'goals',
    'active_quests',
    'quest_checkins',
    'question_history',
    'insight_log',
  ];
  for (const table of tables) {
    await db.execAsync(`DELETE FROM ${table};`);
  }
  await db.runAsync(
    `UPDATE user_profile SET onboarded = 0, age_ack = 0, age_confirmed_at = NULL,
       disclaimer_ack_version = 0, terms_ack_version = 0, privacy_ack_version = 0,
       values_profile = NULL, pattern_tags = NULL, settings = NULL WHERE id = 1;`,
  );
}
