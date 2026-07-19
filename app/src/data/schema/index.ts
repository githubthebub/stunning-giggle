/**
 * Compass content schemas.
 *
 * These zod schemas are the single contract between the editable content files
 * (src/data/content/**) and the app logic. Content is validated against them at
 * load time (see contentLoader.ts) so malformed content fails loudly in dev and
 * never ships silently.
 *
 * IMPORTANT: keep these in sync with the JSON shapes documented in
 * app/content/README.md. If you add a field to a content file, add it here too.
 */
import { z } from 'zod';

/* ------------------------------------------------------------------ */
/* Canonical vocabularies                                             */
/* ------------------------------------------------------------------ */

export const VALUE_DIMENSION_IDS = [
  'autonomy',
  'connection',
  'growth',
  'security',
  'contribution',
  'health',
  'creativity',
  'integrity',
  'adventure',
  'recognition',
] as const;

export const PATTERN_TAG_IDS = [
  'avoidance',
  'people_pleasing',
  'perfectionism',
  'self_criticism',
  'rumination',
  'overcommitment',
  'comparison',
  'black_and_white',
  'fear_of_failure',
  'need_for_control',
] as const;

export const TOPIC_IDS = [
  'career',
  'relationships',
  'habits',
  'burnout',
  'motivation',
  'self_worth',
] as const;

export const DISTORTION_IDS = [
  'all_or_nothing',
  'overgeneralization',
  'mental_filter',
  'discounting_positive',
  'jumping_to_conclusions',
  'magnification',
  'emotional_reasoning',
  'should_statements',
  'labeling',
  'personalization',
] as const;

export const valueDimensionId = z.enum(VALUE_DIMENSION_IDS);
export const patternTagId = z.enum(PATTERN_TAG_IDS);
export const topicId = z.enum(TOPIC_IDS);
export const distortionId = z.enum(DISTORTION_IDS);

export type ValueDimensionId = z.infer<typeof valueDimensionId>;
export type PatternTagId = z.infer<typeof patternTagId>;
export type TopicId = z.infer<typeof topicId>;
export type DistortionId = z.infer<typeof distortionId>;

/**
 * Weight maps are authored by hand in content files, so we keep the key schema
 * permissive (plain string) and lint canonical-id correctness separately
 * (scripts/lintContent). This keeps a single stray key from failing the whole
 * app at runtime while still surfacing the problem in CI/dev tooling.
 */
const weightMap = z.record(z.string(), z.number());

/* ------------------------------------------------------------------ */
/* Values model (onboarding questionnaire)                            */
/* ------------------------------------------------------------------ */

export const valueDimensionDefSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
});

export const patternTagDefSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  supportiveNote: z.string(),
});

export const valuesQuestionOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  valueWeights: weightMap.default({}),
  patternWeights: weightMap.default({}),
});

export const valuesQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  helpText: z.string().optional().default(''),
  type: z.enum(['single', 'multi', 'scale']),
  options: z.array(valuesQuestionOptionSchema).min(2),
});

export const valuesModelSchema = z.object({
  version: z.number(),
  valueDimensions: z.array(valueDimensionDefSchema).min(1),
  patternTags: z.array(patternTagDefSchema).min(1),
  questions: z.array(valuesQuestionSchema).min(1),
});

export type ValuesModel = z.infer<typeof valuesModelSchema>;
export type ValuesQuestion = z.infer<typeof valuesQuestionSchema>;
export type ValuesQuestionOption = z.infer<typeof valuesQuestionOptionSchema>;

/* ------------------------------------------------------------------ */
/* Coaching flows (decision trees)                                    */
/* ------------------------------------------------------------------ */

export const flowEffectsSchema = z.object({
  patternTags: z.array(z.string()).optional().default([]),
  note: z.string().optional(),
});

export const flowChoiceOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  next: z.string(),
  effects: flowEffectsSchema.optional(),
});

export const flowCaptureSchema = z.object({
  field: z.string(),
  placeholder: z.string().optional().default(''),
});

export const flowActionSchema = z.object({
  title: z.string(),
  description: z.string(),
  suggestQuestId: z.string().nullable().optional().default(null),
});

export const flowNodeSchema = z.object({
  id: z.string(),
  type: z.enum(['prompt', 'reframe', 'choice', 'reflection', 'action']),
  text: z.string(),
  next: z.string().optional(),
  options: z.array(flowChoiceOptionSchema).optional(),
  capture: flowCaptureSchema.optional(),
  action: flowActionSchema.optional(),
});

export const flowSchema = z.object({
  id: z.string(),
  topic: z.string(),
  title: z.string(),
  description: z.string(),
  estMinutes: z.number(),
  startNodeId: z.string(),
  nodes: z.array(flowNodeSchema).min(2),
});

export type Flow = z.infer<typeof flowSchema>;
export type FlowNode = z.infer<typeof flowNodeSchema>;
export type FlowChoiceOption = z.infer<typeof flowChoiceOptionSchema>;
export type FlowAction = z.infer<typeof flowActionSchema>;

/* ------------------------------------------------------------------ */
/* Socratic question bank                                             */
/* ------------------------------------------------------------------ */

export const socraticQuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  topics: z.array(z.string()).default([]),
  patternTags: z.array(z.string()).default([]),
  weight: z.number().default(1),
});

export const questionBankSchema = z.object({
  version: z.number(),
  questions: z.array(socraticQuestionSchema).min(1),
});

export type SocraticQuestion = z.infer<typeof socraticQuestionSchema>;
export type QuestionBank = z.infer<typeof questionBankSchema>;

/* ------------------------------------------------------------------ */
/* Cognitive-distortion reframes                                      */
/* ------------------------------------------------------------------ */

export const distortionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  example: z.string(),
  reframePrompts: z.array(z.string()).default([]),
  reframeTemplate: z.string(),
  citation: z.string(),
});

export const distortionsFileSchema = z.object({
  version: z.number(),
  frameworkNote: z.string(),
  distortions: z.array(distortionSchema).min(1),
});

export type Distortion = z.infer<typeof distortionSchema>;
export type DistortionsFile = z.infer<typeof distortionsFileSchema>;

/* ------------------------------------------------------------------ */
/* Quests                                                             */
/* ------------------------------------------------------------------ */

export const questSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  cadence: z.enum(['once', 'daily', 'weekly']),
  linkedValues: z.array(z.string()).default([]),
  linkedPatterns: z.array(z.string()).default([]),
  topics: z.array(z.string()).default([]),
  estMinutes: z.number(),
  encouragement: z.string(),
});

export const questPackSchema = z.object({
  version: z.number(),
  quests: z.array(questSchema).min(1),
});

export type Quest = z.infer<typeof questSchema>;
export type QuestPack = z.infer<typeof questPackSchema>;

/* ------------------------------------------------------------------ */
/* Journaling prompts                                                 */
/* ------------------------------------------------------------------ */

export const journalPromptSchema = z.object({
  id: z.string(),
  text: z.string(),
  topics: z.array(z.string()).default([]),
  patternTags: z.array(z.string()).default([]),
  weight: z.number().default(1),
});

export const journalPromptsSchema = z.object({
  version: z.number(),
  prompts: z.array(journalPromptSchema).min(1),
});

export type JournalPrompt = z.infer<typeof journalPromptSchema>;
export type JournalPrompts = z.infer<typeof journalPromptsSchema>;

/* ------------------------------------------------------------------ */
/* Safety content                                                     */
/* ------------------------------------------------------------------ */

export const crisisKeywordsSchema = z.object({
  version: z.number(),
  note: z.string(),
  keywords: z.array(z.string()).min(1),
  reviewCaveat: z.string(),
});

export const crisisLineSchema = z.object({
  name: z.string(),
  number: z.string(),
  hours: z.string().optional().default(''),
  sms: z.string().nullable().optional().default(null),
  url: z.string().nullable().optional().default(null),
  note: z.string().optional().default(''),
});

export const crisisRegionSchema = z.object({
  code: z.string(),
  label: z.string(),
  lines: z.array(crisisLineSchema).min(1),
});

export const crisisResourcesSchema = z.object({
  version: z.number(),
  defaultRegion: z.string(),
  globalNote: z.string(),
  reviewCaveat: z.string(),
  regions: z.array(crisisRegionSchema).min(1),
});

export type CrisisKeywords = z.infer<typeof crisisKeywordsSchema>;
export type CrisisResources = z.infer<typeof crisisResourcesSchema>;
export type CrisisRegion = z.infer<typeof crisisRegionSchema>;
export type CrisisLine = z.infer<typeof crisisLineSchema>;

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

export type ContentValidationIssue = {
  file: string;
  message: string;
};

/**
 * Validate a parsed JSON object against a schema, returning either the typed
 * value or a list of human-readable issues. Never throws.
 */
export function validateContent<T>(
  file: string,
  schema: z.ZodType<T>,
  raw: unknown,
): { ok: true; value: T } | { ok: false; issues: ContentValidationIssue[] } {
  const result = schema.safeParse(raw);
  if (result.success) {
    return { ok: true, value: result.data };
  }
  const issues = result.error.issues.map((issue) => ({
    file,
    message: `${issue.path.join('.') || '(root)'}: ${issue.message}`,
  }));
  return { ok: false, issues };
}
