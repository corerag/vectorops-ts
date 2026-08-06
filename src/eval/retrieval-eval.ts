/**
 * Retrieval quality evaluation.
 *
 * Loads the fixture corpus from `dataset.ts` into a fresh, in-memory vector
 * store, runs each fixture question through the same `similaritySearch()`
 * path the /query endpoint uses, and scores the results against the
 * ground-truth `relevantIds` for each question using the metrics in
 * `metrics.ts`.
 *
 * This only exercises retrieval (embeddings + vector search) - it never
 * calls Claude, so it runs fully offline and needs no API key.
 *
 * Usage:
 *   npm run eval                 # top-4 retrieval (default)
 *   npm run eval -- --k=6        # evaluate top-6 retrieval instead
 */

import { VectorStoreService } from '../src/services/vectorstore';
import { EVAL_DOCUMENTS, EVAL_QUESTIONS } from './dataset';
import {
  aggregateMetrics,
  isHit,
  precisionAtK,
  recallAtK,
  reciprocalRank,
  scoreSeparation,
  type QuestionResult,
} from './metrics';

function parseK(argv: string[], fallback: number): number {
  const flag = argv.find((arg) => arg.startsWith('--k='));
  if (!flag) return fallback;
  const value = Number(flag.slice('--k='.length));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

async function main(): Promise<void> {
  const k = parseK(process.argv.slice(2), 4);

  // persistPath: null - this is a throwaway fixture corpus, never the real
  // uploaded documents, so it must never read or write data/vectorstore.json.
  const store = new VectorStoreService({ persistPath: null });
  await store.addChunks(
    EVAL_DOCUMENTS.map((doc) => doc.text),
    EVAL_DOCUMENTS.map((doc) => ({ id: doc.id })),
  );

  const results: QuestionResult[] = [];
  for (const evalQuestion of EVAL_QUESTIONS) {
    const matches = await store.similaritySearch(evalQuestion.question, k);
    results.push({
      question: evalQuestion.question,
      relevantIds: evalQuestion.relevantIds,
      retrieved: matches.map((match) => ({ id: String(match.metadata.id ?? ''), score: match.score })),
    });
  }

  console.log(
    `\nRetrieval evaluation - k=${k}, ${EVAL_DOCUMENTS.length} documents, ${EVAL_QUESTIONS.length} questions\n`,
  );

  console.table(
    results.map((result) => {
      const rr = reciprocalRank(result);
      return {
        Question: truncate(result.question, 55),
        Hit: isHit(result, k) ? 'yes' : 'no',
        'Rank of hit': rr === 0 ? '-' : Math.round(1 / rr),
        [`Precision@${k}`]: precisionAtK(result, k).toFixed(2),
        [`Recall@${k}`]: recallAtK(result, k).toFixed(2),
        'Top score': result.retrieved[0]?.score.toFixed(3) ?? '-',
      };
    }),
  );

  const aggregate = aggregateMetrics(results, k);
  const separation = scoreSeparation(results, k);

  console.log('Summary');
  console.log('-------');
  console.log(`Hit Rate@${k}:          ${formatPercent(aggregate.hitRate)}`);
  console.log(`Mean Reciprocal Rank:  ${aggregate.meanReciprocalRank.toFixed(3)}`);
  console.log(`Mean Precision@${k}:     ${formatPercent(aggregate.meanPrecision)}`);
  console.log(`Mean Recall@${k}:        ${formatPercent(aggregate.meanRecall)}`);
  console.log();
  console.log('Score separation (relevant vs. irrelevant retrieved chunks)');
  console.log(
    `  Relevant:   ${separation.avgRelevantScore?.toFixed(3) ?? 'n/a'}\n` +
      `  Irrelevant: ${separation.avgIrrelevantScore?.toFixed(3) ?? 'n/a'}`,
  );

  const failedCount = results.filter((r) => !isHit(r, k)).length;
  if (failedCount > 0) {
    console.log(`\n${failedCount} of ${results.length} question(s) had no relevant chunk in the top ${k}.`);
  }
}

main().catch((error) => {
  console.error('Evaluation failed:', error);
  process.exit(1);
});
