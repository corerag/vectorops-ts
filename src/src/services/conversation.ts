export interface ConversationTurn {
  question: string;
  answer: string;
}

/** How many prior turns to keep per session, bounding both memory use and prompt size. */
const MAX_TURNS_PER_SESSION = 10;

/**
 * In-memory chat history, keyed by session id. Resets when the server
 * restarts - this is conversational scratch space, not durable data (unlike
 * the vector store, which persists to disk).
 */
export class ConversationStore {
  private sessions = new Map<string, ConversationTurn[]>();

  getHistory(sessionId: string): ConversationTurn[] {
    return this.sessions.get(sessionId) ?? [];
  }

  addTurn(sessionId: string, question: string, answer: string): void {
    const history = this.sessions.get(sessionId) ?? [];
    history.push({ question, answer });
    if (history.length > MAX_TURNS_PER_SESSION) {
      history.shift();
    }
    this.sessions.set(sessionId, history);
  }
}
