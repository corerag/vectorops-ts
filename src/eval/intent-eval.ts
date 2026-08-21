/**
 * Intent classifier evaluation.
 *
 * Runs every example in `intent-examples.ts` - both single-turn and
 * multi-turn follow-ups - through `classifyIntent()` for real (live calls
 * to the classifier model) and reports per-category and per-turn-type
 * accuracy plus a confusion matrix, so misclassifications are visible by
 * category pair rather than just as a single aggregate number.
 *
 * Leave-one-out: `classifyIntent()` normally bakes all of `INTENT_EXAMPLES`
 * / `INTENT_MULTITURN_EXAMPLES` into its few-shot prompt, so classifying
 * those same examples would just test whether the model can copy the label
 * off an identical string already sitting in its own prompt - not whether
 * it generalizes to phrasing it hasn't seen labeled. To measure that
 * instead, each example here is classified against a prompt built from
 * every *other* example in its own set, with itself excluded. Multi-turn
 * examples also pass their real `history` as actual conversation turns
 * (the same way `queryRouter.ts` does at request time), not just as a
 * prompt example.
 *
 * This calls the real Anthropic API (unlike retrieval-eval.ts, which runs
 * fully offline) - it needs ANTHROPIC_API_KEY and will make one request per
 * example (currently 152). Leave-one-out also means each request gets a
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
import { INTENT_EXAMPLES, INTENT_MULTITURN_EXAMPLES, type IntentCategory } from './intent-examples';
import { accuracyByCategory, confusionMatrix, overallAccuracy, type IntentResult } from './intent-metrics';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const CATEGORIES: IntentCategory[] = ['factual_lookup', 'summarization', 'out_of_scope', 'conversational'];

// Examples are independent, so classify several concurrently rather than
// one request at a time - 150+ examples serially would take several minutes.
const CONCURRENCY = 8;

function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

interface EvalTask {
  text: string;
  expected: IntentCategory;
  turnType: 'single' | 'multi';
  run: () => Promise<IntentCategory>;
}

function buildTasks(): EvalTask[] {
  const singleTurnTasks: EvalTask[] = INTENT_EXAMPLES.map((example, index) => ({
    text: example.text,
    expected: example.category,
    turnType: 'single',
    run: () =>
      classifyIntent(example.text, {
        examples: INTENT_EXAMPLES.filter((_, i) => i !== index),
      }),
  }));

  const multiTurnTasks: EvalTask[] = INTENT_MULTITURN_EXAMPLES.map((example, index) => ({
    text: example.followUp,
    expected: example.category,
    turnType: 'multi',
    run: () =>
      classifyIntent(example.followUp, {
        history: example.history,
        multiTurnExamples: INTENT_MULTITURN_EXAMPLES.filter((_, i) => i !== index),
      }),
  }));

  return [...singleTurnTasks, ...multiTurnTasks];
}

async function classifyAll(): Promise<IntentResult[]> {
  const queue = buildTasks();
  const results: IntentResult[] = [];

  async function worker(): Promise<void> {
    for (let task = queue.shift(); task; task = queue.shift()) {
      const predicted = await task.run();
      results.push({ text: task.text, expected: task.expected, predicted, turnType: task.turnType });
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results;
}

async function main(): Promise<void> {
  const total = INTENT_EXAMPLES.length + INTENT_MULTITURN_EXAMPLES.length;
  console.log(
    `\nIntent classifier evaluation - ${INTENT_EXAMPLES.length} single-turn + ` +
      `${INTENT_MULTITURN_EXAMPLES.length} multi-turn = ${total} examples\n`,
  );

  const results = await classifyAll();
  const misses = results.filter((result) => result.expected !== result.predicted);

  if (misses.length > 0) {
    console.log(`Misclassifications (${misses.length}):`);
    console.table(
      misses.map((result) => ({
        Turn: result.turnType,
        Text: truncate(result.text, 55),
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

  console.log('Accuracy by turn type');
  console.log('----------------------');
  console.table(
    (['single', 'multi'] as const).map((turnType) => {
      const subset = results.filter((r) => r.turnType === turnType);
      const correct = subset.filter((r) => r.expected === r.predicted).length;
      return {
        'Turn type': turnType,
        Correct: correct,
        Total: subset.length,
        Accuracy: formatPercent(overallAccuracy(subset)),
      };
    }),
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
