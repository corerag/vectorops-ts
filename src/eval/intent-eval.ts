/**
 * Intent classifier evaluation.
 *
 * Runs every example in `intent-examples.ts` through `classifyIntent()` for
 * real (live calls to the classifier model) and reports per-category
 * accuracy plus a confusion matrix, so misclassifications are visible by
 * category pair rather than just as a single aggregate number.
 *
 * Leave-one-out: `classifyIntent()` normally bakes all of `INTENT_EXAMPLES`
 * into its few-shot prompt, so classifying those same examples would just
 * test whether the model can copy the label off an identical string
 * already sitting in its own prompt - not whether it generalizes to
 * phrasing it hasn't seen labeled. To measure that instead, each example
 * here is classified against a prompt built from every *other* example,
 * with itself excluded.
 *
 * This calls the real Anthropic API (unlike retrieval-eval.ts, which runs
 * fully offline) - it needs ANTHROPIC_API_KEY and will make one request per
 * example (currently 120). Leave-one-out also means each request gets a
 * slightly different prompt, so the classifier's prompt-caching optimization
 * (see intentClassifier.ts) doesn't apply here - that's fine for an
 * occasional manual/CI check, but makes this noticeably slower and pricier
 * per run than production traffic.
 *
 * Usage:
 *   npm run eval:intent
 */
import path from 'path';
import dotenv from 'dotenv';
import { classifyIntent } from '../src/services/intentClassifier';
import { INTENT_EXAMPLES, type IntentCategory } from './intent-examples';
import { accuracyByCategory, confusionMatrix, overallAccuracy, type IntentResult } from './intent-metrics';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const CATEGORIES: IntentCategory[] = ['factual_lookup', 'summarization', 'out_of_scope', 'conversational'];

// Examples are independent, so classify several concurrently rather than
// one request at a time - 120 examples serially would take several minutes.
const CONCURRENCY = 8;

function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

async function classifyAll(): Promise<IntentResult[]> {
  const queue = INTENT_EXAMPLES.map((example, index) => ({ example, index }));
  const results: IntentResult[] = [];

  async function worker(): Promise<void> {
    for (let item = queue.shift(); item; item = queue.shift()) {
      const heldOutExamples = INTENT_EXAMPLES.filter((_, i) => i !== item.index);
      const predicted = await classifyIntent(item.example.text, { examples: heldOutExamples });
      results.push({ text: item.example.text, expected: item.example.category, predicted });
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results;
}

async function main(): Promise<void> {
  console.log(`\nIntent classifier evaluation - ${INTENT_EXAMPLES.length} examples\n`);

  const results = await classifyAll();
  const misses = results.filter((result) => result.expected !== result.predicted);

  if (misses.length > 0) {
    console.log(`Misclassifications (${misses.length}):`);
    console.table(
      misses.map((result) => ({
        Text: truncate(result.text, 60),
        Expected: result.expected,
        Got: result.predicted,
      })),
    );
  } else {
    console.log('No misclassifications.');
  }

  console.log('\nAccuracy by category');
  console.log('---------------------');
  console.table(
    accuracyByCategory(results, CATEGORIES).map((c) => ({
      Category: c.category,
      Correct: c.correct,
      Total: c.total,
      Accuracy: formatPercent(c.accuracy),
    })),
  );

  console.log('Confusion matrix (rows = expected, columns = predicted)');
  const matrix = confusionMatrix(results, CATEGORIES);
  console.table(
    Object.fromEntries(
      CATEGORIES.map((expected) => [expected, matrix[expected]]),
    ),
  );

  const correctCount = results.length - misses.length;
  console.log(
    `\nOverall accuracy: ${formatPercent(overallAccuracy(results))} (${correctCount}/${results.length})`,
  );
}

main().catch((error) => {
  console.error('Intent evaluation failed:', error);
  process.exit(1);
});
