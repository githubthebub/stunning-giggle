/**
 * Static content registry.
 *
 * Every curated content file is imported here so the React Native bundler packs
 * it into the app (fully offline). This module holds the RAW imports only —
 * validation into typed, trusted content happens in ../contentLoader.ts.
 *
 * To add a new coaching flow: drop a JSON file in ./flows, import it here, and
 * add it to `rawFlows`. Nothing else needs to change.
 */
import valuesModel from './values/valuesModel.json';
import careerFlow from './flows/career-clarity.json';
import burnoutFlow from './flows/burnout.json';
import relationshipsFlow from './flows/relationships.json';
import questionBank from './questions/questionBank.json';
import distortions from './distortions/distortions.json';
import quests from './quests/starterQuests.json';
import journalPrompts from './journal/prompts.json';
import crisisKeywords from './safety/crisisKeywords.json';
import crisisResources from './safety/crisisResources.json';

export { disclaimerMarkdown, termsMarkdown, privacyMarkdown } from './legal/legalText';

export const rawValuesModel: unknown = valuesModel;
export const rawFlows: unknown[] = [careerFlow, burnoutFlow, relationshipsFlow];
export const rawQuestionBank: unknown = questionBank;
export const rawDistortions: unknown = distortions;
export const rawQuestPack: unknown = quests;
export const rawJournalPrompts: unknown = journalPrompts;
export const rawCrisisKeywords: unknown = crisisKeywords;
export const rawCrisisResources: unknown = crisisResources;
