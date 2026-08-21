import type { ConversationTurn } from './conversation';
import { classifyIntent, type IntentCategory } from './intentClassifier';
import { answerConversationally, answerQuestion, condenseQuestion } from './qa';
import type { SimilarityMatch, VectorStoreService } from './vectorstore';

export interface QueryResult {
  intent: IntentCategory;
  answer: string;
  sources: SimilarityMatch[];
}

const OUT_OF_SCOPE_REPLY =
  "That's outside what I can help with here - I can only answer questions about the documents " +
  "I have access to (this person's resume and certifications).";

const NO_DOCUMENTS_REPLY = "I don't have any documents to search yet. Upload something first via /upload.";

/**
 * Retrieval breadth for summarization intents, as a multiple of the caller's
 * requested k - synthesizing an overview needs a wider slice of the
 * documents than pinpointing a single fact does.
 */
const SUMMARIZATION_K_MULTIPLIER = 3;

/**
 * Classifies the question's intent and routes it accordingly:
 *  - out_of_scope / conversational: retrieval is skipped entirely (no
 *    vectorStore call), since neither needs document context.
 *  - factual_lookup: the existing retrieve-then-answer pipeline.
 *  - summarization: same pipeline, but retrieves a wider slice of the
 *    documents and uses a synthesis-oriented prompt instead of the
 *    pinpoint-a-fact one.
 */
export async function routeQuery(
  vectorStore: VectorStoreService,
  question: string,
  history: ConversationTurn[],
  k: number,
): Promise<QueryResult> {
  const intent = await classifyIntent(question, { history });

  if (intent === 'out_of_scope') {
    return { intent, answer: OUT_OF_SCOPE_REPLY, sources: [] };
  }

  if (intent === 'conversational') {
    const answer = await answerConversationally(question, history);
    return { intent, answer, sources: [] };
  }

  const retrievalK = intent === 'summarization' ? k * SUMMARIZATION_K_MULTIPLIER : k;

  // Follow-ups are often pronoun-only ("how does it compare to X?"), which
  // embeds poorly on its own - rewrite to a standalone question before
  // retrieval so it actually finds the right chunks. Skipped on the first
  // turn, where there's nothing to resolve against.
  const retrievalQuery = history.length > 0 ? await condenseQuestion(history, question) : question;
  const matches = await vectorStore.similaritySearch(retrievalQuery, retrievalK);

  if (matches.length === 0) {
    return { intent, answer: NO_DOCUMENTS_REPLY, sources: [] };
  }

  const answer = await answerQuestion(
    question,
    matches.map((m) => m.content),
    history,
    intent === 'summarization' ? 'summarization' : 'qa',
  );

  return { intent, answer, sources: matches };
}
