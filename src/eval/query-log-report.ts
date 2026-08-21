/**
 * Reads the real query traffic log (data/query-log.jsonl, written by
 * QueryLogger on every /query request - see src/server.ts) and reports
 * summary stats: how many queries have been logged, over what date range,
 * and the intent distribution across them.
 *
 * This is the fix for the gap noted when intent-examples.ts was first
 * hand-written: at the time, nothing persisted real traffic to disk, so
 * there was nothing to mine and every example had to be guessed by hand.
 * Once this log has accumulated real usage, re-run this periodically to
 * see how the real query distribution compares to the hand-written seed
 * examples - a category that's rare here but heavily represented in
 * intent-examples.ts (or vice versa) is a signal the seed set needs
 * rebalancing.
 *
 * Runs fully offline (just reads a local file) - no ANTHROPIC_API_KEY
 * needed, unlike intent-eval.ts.
 *
 * Usage:
 *   npm run eval:log
 */
import fs from 'fs';
import path from 'path';
import type { QueryLogEntry } from '../src/services/queryLog';

const LOG_PATH = path.resolve(__dirname, '..', '..', 'data', 'query-log.jsonl');

function loadEntries(): QueryLogEntry[] {
  if (!fs.existsSync(LOG_PATH)) return [];

  return fs
    .readFileSync(LOG_PATH, 'utf-8')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as QueryLogEntry);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function main(): void {
  const entries = loadEntries();

  if (entries.length === 0) {
    console.log(`\nNo query traffic logged yet at ${LOG_PATH}`);
    console.log('Entries are appended automatically by the running server on each /query request.\n');
    return;
  }

  const timestamps = entries.map((entry) => entry.timestamp).sort();
  console.log(`\nQuery traffic report - ${entries.length} logged queries`);
  console.log(`Date range: ${timestamps[0]} to ${timestamps[timestamps.length - 1]}\n`);

  const byIntent = new Map<string, number>();
  for (const entry of entries) {
    byIntent.set(entry.intent, (byIntent.get(entry.intent) ?? 0) + 1);
  }

  console.log('Intent distribution');
  console.log('--------------------');
  console.table(
    [...byIntent.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([intent, count]) => ({
        Intent: intent,
        Count: count,
        Share: formatPercent(count / entries.length),
      })),
  );

  const sessionIds = entries.map((entry) => entry.sessionId).filter((id): id is string => id !== null);
  const uniqueSessions = new Set(sessionIds).size;
  const standalone = entries.length - sessionIds.length;

  console.log(`\nUnique sessions: ${uniqueSessions}`);
  console.log(`Stand-alone (no session_id) queries: ${standalone}`);
}

main();
