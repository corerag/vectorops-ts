import fs from 'fs/promises';
import path from 'path';
import type { IntentCategory } from './intentClassifier';

export interface QueryLogEntry {
  timestamp: string;
  sessionId: string | null;
  question: string;
  intent: IntentCategory;
  answer: string;
  sourceCount: number;
}

export interface QueryLoggerOptions {
  /**
   * Where to append log entries, one JSON object per line (JSONL). Defaults
   * to `<project root>/data/query-log.jsonl`.
   *
   * Pass `null` to disable logging entirely - mirrors
   * `VectorStoreService`'s `persistPath: null` escape hatch, for any future
   * caller (tests, a script) that shouldn't write to the real log.
   */
  logPath?: string | null;
}

const DEFAULT_LOG_PATH = path.resolve(__dirname, '../../../data/query-log.jsonl');

/**
 * Appends every real query (question, classified intent, answer) to a
 * JSONL file on disk, so real traffic can eventually inform
 * `intent-examples.ts` and the retrieval fixtures instead of relying
 * entirely on hand-written examples - see `intent-eval.ts` and
 * `query-log-report.ts`.
 */
export class QueryLogger {
  private readonly logPath: string | null;

  constructor(options: QueryLoggerOptions = {}) {
    this.logPath = options.logPath === undefined ? DEFAULT_LOG_PATH : options.logPath;
  }

  /**
   * Best-effort - a write failure (e.g. disk full, directory missing) is
   * logged to stderr and swallowed, so logging can never break the actual
   * response to a real request.
   */
  async record(entry: Omit<QueryLogEntry, 'timestamp'>): Promise<void> {
    if (!this.logPath) return;

    const line = `${JSON.stringify({ timestamp: new Date().toISOString(), ...entry })}\n`;

    try {
      await fs.mkdir(path.dirname(this.logPath), { recursive: true });
      await fs.appendFile(this.logPath, line, 'utf-8');
    } catch (error) {
      console.error('QueryLogger: failed to write log entry:', error);
    }
  }
}
