/**
 * Pure scoring helpers for the intent classifier evaluation (see
 * `intent-eval.ts`). Mirrors the split in `metrics.ts` - metric computation
 * kept separate from the runner script that produces the results.
 */
import type { IntentCategory } from './intent-examples';

export interface IntentResult {
  text: string;
  expected: IntentCategory;
  predicted: IntentCategory;
}

export function isCorrect(result: IntentResult): boolean {
  return result.expected === result.predicted;
}

export interface CategoryAccuracy {
  category: IntentCategory;
  correct: number;
  total: number;
  accuracy: number;
}

export function accuracyByCategory(
  results: IntentResult[],
  categories: readonly IntentCategory[],
): CategoryAccuracy[] {
  return categories.map((category) => {
    const inCategory = results.filter((result) => result.expected === category);
    const correct = inCategory.filter(isCorrect).length;
    return {
      category,
      correct,
      total: inCategory.length,
      accuracy: inCategory.length > 0 ? correct / inCategory.length : 0,
    };
  });
}

export function overallAccuracy(results: IntentResult[]): number {
  if (results.length === 0) return 0;
  return results.filter(isCorrect).length / results.length;
}

/** confusion[expected][predicted] = count of examples with that expected/predicted pair. */
export type ConfusionMatrix = Record<IntentCategory, Record<IntentCategory, number>>;

export function confusionMatrix(
  results: IntentResult[],
  categories: readonly IntentCategory[],
): ConfusionMatrix {
  const matrix = Object.fromEntries(
    categories.map((expected) => [
      expected,
      Object.fromEntries(categories.map((predicted) => [predicted, 0])),
    ]),
  ) as ConfusionMatrix;

  for (const result of results) {
    matrix[result.expected][result.predicted] += 1;
  }

  return matrix;
}
