/**
 * Retrieval-quality metrics for a single question.
 *
 * These are the standard information-retrieval metrics, computed against a
 * fixed top-k cutoff:
 *
 * - Hit Rate@k     - did at least one relevant document appear in the top k?
 * - Reciprocal Rank - 1 / (rank of the first relevant document), 0 if none.
 * - Precision@k    - what fraction of the top k results were relevant?
 * - Recall@k       - what fraction of all relevant documents were retrieved
 *                    within the top k?
 *
 * All functions are pure and take a `QuestionResult` - the question's ground
 * truth (`relevantIds`) plus the ranked list of retrieved document ids
 * (`retrieved`, best match first, as returned by the vector store).
 */

export interface RetrievedItem {
  id: string;
  score: number;
}

export interface QuestionResult {
  question: string;
  relevantIds: string[];
  /** Ranked best-to-worst, as returned by the vector store. */
  retrieved: RetrievedItem[];
}

/** True if any of the top-k retrieved documents is in the relevant set. */
export function isHit(result: QuestionResult, k: number): boolean {
  const relevant = new Set(result.relevantIds);
  return result.retrieved.slice(0, k).some((item) => relevant.has(item.id));
}

/**
 * 1 / (1-indexed rank of the first relevant document), or 0 if none of the
 * retrieved documents are relevant. Rewards ranking relevant results higher,
 * not just including them somewhere in the list.
 */
export function reciprocalRank(result: QuestionResult): number {
  const relevant = new Set(result.relevantIds);
  const index = result.retrieved.findIndex((item) => relevant.has(item.id));
  return index === -1 ? 0 : 1 / (index + 1);
}

/** Fraction of the top-k retrieved documents that are actually relevant. */
export function precisionAtK(result: QuestionResult, k: number): number {
  const relevant = new Set(result.relevantIds);
  const topK = result.retrieved.slice(0, k);
  if (topK.length === 0) return 0;
  const relevantRetrieved = topK.filter((item) => relevant.has(item.id)).length;
  return relevantRetrieved / topK.length;
}

/** Fraction of all relevant documents that were retrieved within the top-k. */
export function recallAtK(result: QuestionResult, k: number): number {
  const relevant = new Set(result.relevantIds);
  if (relevant.size === 0) return 0;
  const topK = result.retrieved.slice(0, k);
  const relevantRetrieved = topK.filter((item) => relevant.has(item.id)).length;
  return relevantRetrieved / relevant.size;
}

export interface AggregateMetrics {
  /** Mean of isHit() across all questions - "did we find something right, at all?" */
  hitRate: number;
  /** Mean reciprocal rank across all questions - rewards ranking the right chunk first. */
  meanReciprocalRank: number;
  meanPrecision: number;
  meanRecall: number;
}

/** Averages the per-question metrics above across a full result set. */
export function aggregateMetrics(results: QuestionResult[], k: number): AggregateMetrics {
  if (results.length === 0) {
    return { hitRate: 0, meanReciprocalRank: 0, meanPrecision: 0, meanRecall: 0 };
  }

  const average = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

  return {
    hitRate: average(results.map((r) => (isHit(r, k) ? 1 : 0))),
    meanReciprocalRank: average(results.map(reciprocalRank)),
    meanPrecision: average(results.map((r) => precisionAtK(r, k))),
    meanRecall: average(results.map((r) => recallAtK(r, k))),
  };
}

export interface ScoreSeparation {
  /** Average similarity score of retrieved chunks that were actually relevant. */
  avgRelevantScore: number | null;
  /** Average similarity score of retrieved chunks that were not relevant. */
  avgIrrelevantScore: number | null;
}

/**
 * A well-behaved retriever should score relevant chunks noticeably higher
 * than irrelevant ones. This pools every retrieved item (within top-k)
 * across all questions and averages its score by whether it was relevant,
 * so you can see whether the embedding actually separates the two - a
 * bigger gap means a more useful similarity score, independent of whether
 * the correct chunk happened to rank first.
 */
export function scoreSeparation(results: QuestionResult[], k: number): ScoreSeparation {
  const relevantScores: number[] = [];
  const irrelevantScores: number[] = [];

  for (const result of results) {
    const relevant = new Set(result.relevantIds);
    for (const item of result.retrieved.slice(0, k)) {
      (relevant.has(item.id) ? relevantScores : irrelevantScores).push(item.score);
    }
  }

  const average = (values: number[]) =>
    values.length === 0 ? null : values.reduce((sum, v) => sum + v, 0) / values.length;

  return {
    avgRelevantScore: average(relevantScores),
    avgIrrelevantScore: average(irrelevantScores),
  };
}
