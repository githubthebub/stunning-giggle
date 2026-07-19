/**
 * Central, editable configuration for Compass.
 *
 * Everything the spec calls "configurable" lives here (age threshold, default
 * crisis region, pattern-detection thresholds, feature flags). Nothing in this
 * file causes a network call and no value here is transmitted anywhere.
 */

export const appConfig = {
  /** App display name. */
  appName: 'Compass',

  /**
   * Minimum age to use the app. The spec requires an 18+ gate with a
   * configurable threshold — change this single value to adjust it.
   */
  minimumAge: 18,

  /**
   * Bumping either version re-prompts the user to re-acknowledge on next
   * launch. Increment when the disclaimer / terms text materially changes.
   */
  disclaimerVersion: 1,
  termsVersion: 1,
  privacyVersion: 1,

  /** Default crisis-resource region code (must exist in crisisResources.json). */
  defaultCrisisRegion: 'XX',

  /**
   * Pattern-recurrence thresholds. The detector is pure counting: it fires a
   * gentle call-out when a pattern/mood-tag has been logged at least
   * `minOccurrences` times inside a rolling `windowDays` window.
   */
  patterns: {
    windowDays: 30,
    minOccurrences: 5,
    /** Don't re-surface the same call-out more often than this. */
    cooldownDays: 7,
  },

  /**
   * Socratic question selection. `recentMemory` is how many recently-served
   * items to actively avoid before the pool is allowed to cycle.
   */
  questionSelection: {
    recentMemory: 12,
    /** How strongly a matching pattern tag boosts a question's score. */
    patternBoost: 1.5,
    /** Penalty applied to items served recently (per selection engine). */
    recencyPenalty: 4,
  },

  /** Mood scale used across the app (inclusive integer range). */
  mood: {
    min: 1,
    max: 5,
  },

  /**
   * Feature flags. Everything defaults to the local-first, no-network posture
   * described in the spec. `optInDiagnostics` is here only to make the
   * "if you ever add telemetry, it is opt-in and content-free" promise explicit
   * and testable — it is OFF and unused by default.
   */
  features: {
    optInDiagnostics: false,
  },
} as const;

export type AppConfig = typeof appConfig;
