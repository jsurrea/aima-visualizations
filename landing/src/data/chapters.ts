/**
 * Chapter data for the landing page, derived from each chapter's manifest.json.
 *
 * The authoritative data for each chapter lives in:
 *   /chapter-XX-name/manifest.json
 *
 * This file imports those manifests at build time and transforms them into
 * ChapterData objects consumed by ChapterGridClient.
 */

import { manifestToChapterData, type ChapterData, type ManifestData } from '../types/chapter';

// Re-export types and helpers so existing imports from this module still work.
export type { ChapterData };
export { PART_NAMES, PART_COLORS } from '../types/chapter';

// ─── Build-time manifest imports ─────────────────────────────────────────────
// Each import resolves at build time (Vite handles JSON natively).
// The relative path goes up two levels: landing/src/data/ → repo root.

import ch01 from '../../../chapter-01-introduction/manifest.json';
import ch02 from '../../../chapter-02-agents/manifest.json';
import ch03 from '../../../chapter-03-search/manifest.json';
import ch04 from '../../../chapter-04-search-complex/manifest.json';
import ch05 from '../../../chapter-05-csp/manifest.json';
import ch06 from '../../../chapter-06-adversarial/manifest.json';
import ch07 from '../../../chapter-07-logical-agents/manifest.json';
import ch08 from '../../../chapter-08-first-order-logic/manifest.json';
import ch09 from '../../../chapter-09-inference-fol/manifest.json';
import ch10 from '../../../chapter-10-knowledge-rep/manifest.json';
import ch11 from '../../../chapter-11-planning/manifest.json';
import ch12 from '../../../chapter-12-uncertainty/manifest.json';
import ch13 from '../../../chapter-13-probabilistic-reasoning/manifest.json';
import ch14 from '../../../chapter-14-temporal-reasoning/manifest.json';
import ch15 from '../../../chapter-15-simple-decisions/manifest.json';
import ch16 from '../../../chapter-16-complex-decisions/manifest.json';
import ch17 from '../../../chapter-17-multiagent/manifest.json';
import ch18 from '../../../chapter-18-prob-programming/manifest.json';
import ch19 from '../../../chapter-19-learning/manifest.json';
import ch20 from '../../../chapter-20-knowledge-learning/manifest.json';
import ch21 from '../../../chapter-21-prob-models/manifest.json';
import ch22 from '../../../chapter-22-deep-learning/manifest.json';
import ch23 from '../../../chapter-23-reinforcement-learning/manifest.json';
import ch24 from '../../../chapter-24-nlp/manifest.json';
import ch25 from '../../../chapter-25-deep-nlp/manifest.json';
import ch26 from '../../../chapter-26-robotics/manifest.json';
import ch27 from '../../../chapter-27-computer-vision/manifest.json';
import ch28 from '../../../chapter-28-ethics-safety/manifest.json';
import ch29 from '../../../chapter-29-future-ai/manifest.json';
import appA from '../../../appendix-a-math/manifest.json';
import appB from '../../../appendix-b-languages/manifest.json';

// ─── CHAPTERS array ───────────────────────────────────────────────────────────

const rawManifests: ManifestData[] = [
  ch01, ch02, ch03, ch04, ch05, ch06, ch07, ch08, ch09, ch10,
  ch11, ch12, ch13, ch14, ch15, ch16, ch17, ch18, ch19, ch20,
  ch21, ch22, ch23, ch24, ch25, ch26, ch27, ch28, ch29,
  appA, appB,
] as ManifestData[];

export const CHAPTERS: ChapterData[] = rawManifests.map(manifestToChapterData);
