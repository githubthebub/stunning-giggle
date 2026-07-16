/**
 * Validates the raw bundled content against the zod schemas and assembles a
 * single, typed, trusted `AppContent` object for the rest of the app.
 *
 * In development, validation issues throw loudly so bad content is caught before
 * it ships. In production the loader is tolerant: it logs issues and returns
 * whatever validated successfully, so a single malformed entry can't hard-crash
 * the app in a user's hands.
 */
import {
  valuesModelSchema,
  flowSchema,
  questionBankSchema,
  distortionsFileSchema,
  questPackSchema,
  journalPromptsSchema,
  crisisKeywordsSchema,
  crisisResourcesSchema,
  validateContent,
  type ValuesModel,
  type Flow,
  type QuestionBank,
  type DistortionsFile,
  type QuestPack,
  type JournalPrompts,
  type CrisisKeywords,
  type CrisisResources,
  type ContentValidationIssue,
} from './schema';
import {
  rawValuesModel,
  rawFlows,
  rawQuestionBank,
  rawDistortions,
  rawQuestPack,
  rawJournalPrompts,
  rawCrisisKeywords,
  rawCrisisResources,
} from './content/registry';

export type AppContent = {
  valuesModel: ValuesModel;
  flows: Flow[];
  questionBank: QuestionBank;
  distortions: DistortionsFile;
  quests: QuestPack;
  journalPrompts: JournalPrompts;
  crisisKeywords: CrisisKeywords;
  crisisResources: CrisisResources;
};

export function loadContent(): { content: AppContent; issues: ContentValidationIssue[] } {
  const issues: ContentValidationIssue[] = [];

  function req<T>(file: string, schema: Parameters<typeof validateContent<T>>[1], raw: unknown, fallback: T): T {
    const result = validateContent<T>(file, schema, raw);
    if (result.ok) return result.value;
    issues.push(...result.issues);
    return fallback;
  }

  const flows: Flow[] = [];
  rawFlows.forEach((raw, i) => {
    const result = validateContent<Flow>(`flows[${i}]`, flowSchema, raw);
    if (result.ok) flows.push(result.value);
    else issues.push(...result.issues);
  });

  const content: AppContent = {
    valuesModel: req<ValuesModel>('valuesModel.json', valuesModelSchema, rawValuesModel, {
      version: 0,
      valueDimensions: [],
      patternTags: [],
      questions: [],
    }),
    flows,
    questionBank: req<QuestionBank>('questionBank.json', questionBankSchema, rawQuestionBank, {
      version: 0,
      questions: [],
    }),
    distortions: req<DistortionsFile>('distortions.json', distortionsFileSchema, rawDistortions, {
      version: 0,
      frameworkNote: '',
      distortions: [],
    }),
    quests: req<QuestPack>('starterQuests.json', questPackSchema, rawQuestPack, {
      version: 0,
      quests: [],
    }),
    journalPrompts: req<JournalPrompts>('prompts.json', journalPromptsSchema, rawJournalPrompts, {
      version: 0,
      prompts: [],
    }),
    crisisKeywords: req<CrisisKeywords>('crisisKeywords.json', crisisKeywordsSchema, rawCrisisKeywords, {
      version: 0,
      note: '',
      keywords: [],
      reviewCaveat: '',
    }),
    crisisResources: req<CrisisResources>('crisisResources.json', crisisResourcesSchema, rawCrisisResources, {
      version: 0,
      defaultRegion: 'XX',
      globalNote: '',
      reviewCaveat: '',
      regions: [],
    }),
  };

  return { content, issues };
}

/**
 * Convenience singleton used by the app. Validated once at module load.
 * `__DEV__` is a React Native global; guarded so this file is also importable
 * under Node (tests) where it is undefined.
 */
const loaded = loadContent();

declare const __DEV__: boolean | undefined;
if (typeof __DEV__ !== 'undefined' && __DEV__ && loaded.issues.length) {
  // Surface loudly in development.

  console.warn(
    `[Compass] content validation issues (${loaded.issues.length}):\n` +
      loaded.issues.map((i) => ` - ${i.file} ${i.message}`).join('\n'),
  );
}

export const appContent: AppContent = loaded.content;
export const contentIssues: ContentValidationIssue[] = loaded.issues;
