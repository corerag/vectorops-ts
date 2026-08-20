/**
 * Manual smoke test for the intent classifier - not part of the automated
 * eval harness. Picks a few examples per category from intent-examples.ts,
 * classifies each for real, and reports mismatches.
 *
 * Note: unlike intent-eval.ts, this classifies examples using the default
 * (production) prompt, which includes every example in its own few-shot
 * list - so a pass here mainly confirms the wiring works end to end, not
 * that the classifier generalizes to unseen phrasing. Use intent-eval.ts
 * (leave-one-out) for a real accuracy number.
 *
 * Usage: npx ts-node src/eval/intent-smoke-test.ts
 */
import path from 'path';
import dotenv from 'dotenv';
import { classifyIntent } from '../src/services/intentClassifier';
import { INTENT_EXAMPLES, type IntentCategory } from './intent-examples';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SAMPLE_SIZE_PER_CATEGORY = 5;

function sample(category: IntentCategory, n: number): string[] {
  return INTENT_EXAMPLES.filter((ex) => ex.category === category)
    .slice(0, n)
    .map((ex) => ex.text);
}

async function main(): Promise<void> {
  const categories: IntentCategory[] = ['factual_lookup', 'summarization', 'out_of_scope', 'conversational'];

  let correct = 0;
  let total = 0;

  for (const category of categories) {
    console.log(`\n=== ${category} ===`);
    for (const text of sample(category, SAMPLE_SIZE_PER_CATEGORY)) {
      const predicted = await classifyIntent(text);
      const ok = predicted === category;
      total += 1;
      if (ok) correct += 1;
      console.log(`${ok ? 'OK  ' : 'MISS'}  expected=${category.padEnd(16)} got=${predicted.padEnd(16)} "${text}"`);
    }
  }

  console.log(`\n${correct}/${total} correct`);
  if (correct !== total) process.exitCode = 1;
}

main().catch((error) => {
  console.error('Smoke test failed:', error);
  process.exit(1);
});
