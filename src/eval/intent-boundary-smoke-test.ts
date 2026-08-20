import path from 'path';
import dotenv from 'dotenv';
import { classifyIntent } from '../src/services/intentClassifier';
import type { IntentCategory } from './intent-examples';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const CASES: { text: string; expected: IntentCategory }[] = [
  { text: 'How does a Security+ cert compare to a CISSP in general?', expected: 'out_of_scope' },
  { text: 'What are the general requirements to get an FAA Part 107 license?', expected: 'out_of_scope' },
  { text: "Write a generic cover letter template I can reuse for any job - don't bother matching it to my background.", expected: 'out_of_scope' },
  { text: 'Can you summarize the plot of the book Dune?', expected: 'out_of_scope' },
  { text: 'Help me write a cover letter pulling from my actual work experience for a systems admin role.', expected: 'summarization' },
  { text: 'Can I ask you something unrelated to my resume real quick?', expected: 'conversational' },
  { text: 'Are you able to actually update my resume, or just answer questions about it?', expected: 'conversational' },
];

async function main() {
  let correct = 0;
  for (const { text, expected } of CASES) {
    const predicted = await classifyIntent(text);
    const ok = predicted === expected;
    if (ok) correct += 1;
    console.log(`${ok ? 'OK  ' : 'MISS'}  expected=${expected.padEnd(16)} got=${predicted.padEnd(16)} "${text}"`);
  }
  console.log(`\n${correct}/${CASES.length} correct`);
}

main().catch((e) => { console.error(e); process.exit(1); });
