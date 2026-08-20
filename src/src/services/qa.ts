import { ChatAnthropic } from '@langchain/anthropic';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { ConversationTurn } from './conversation';

const SYSTEM_PROMPT = `You are a helpful assistant answering questions using only the provided context.
If the context doesn't contain the answer, say you don't know instead of guessing.
Earlier turns of this conversation may be included before the question - use them to understand
follow-ups (e.g. what "it" or "that" refers to), but still answer only from the provided context.`;

const SUMMARIZATION_SYSTEM_PROMPT = `You are a helpful assistant producing a synthesized overview
using only the provided context. The user wants synthesis across the context, not a single
pinpointed fact - cover the relevant breadth of what's provided rather than just the first matching
detail, and organize the answer (e.g. with short sections or bullet points) when that makes it
easier to follow. If the context doesn't fully support what's being asked, say what's missing
instead of guessing. Earlier turns of this conversation may be included before the question - use
them to understand follow-ups, but still answer only from the provided context.`;

const CONVERSATIONAL_SYSTEM_PROMPT = `You are a helpful assistant for a personal document Q&A tool
that answers questions about the person's resume and professional certifications. The user's
message is small talk, a greeting, thanks, or a meta question about you rather than a document
lookup - respond briefly and naturally, without inventing document content. If asked what you can
help with, mention that you can answer questions about the person's background, certifications,
and work history.`;

const CONDENSE_SYSTEM_PROMPT = `Rewrite the user's latest message as a standalone question that makes
full sense without the conversation history - resolve pronouns and implicit references (e.g. "it",
"that", "the second one") to what they actually refer to. Preserve the original intent exactly; do not
answer the question, just rewrite it. Respond with only the rewritten question and nothing else.`;

let model: ChatAnthropic | null = null;

function getModel(): ChatAnthropic {
  if (!model) {
    model = new ChatAnthropic({ model: 'claude-opus-5' });
  }
  return model;
}

function extractText(content: unknown): string {
  return typeof content === 'string' ? content : JSON.stringify(content);
}

function historyToMessages(history: ConversationTurn[]) {
  return history.flatMap((turn) => [new HumanMessage(turn.question), new AIMessage(turn.answer)]);
}

/**
 * Rewrites a follow-up question into a standalone one, using prior turns -
 * needed because retrieval embeds the question in isolation, so "how does it
 * compare to fine-tuning?" has to become "how does RAG compare to
 * fine-tuning?" before it can retrieve the right chunks. Only meaningful
 * when there's history to resolve against; callers should skip this on the
 * first turn of a conversation.
 */
export async function condenseQuestion(history: ConversationTurn[], question: string): Promise<string> {
  if (history.length === 0) return question;

  const transcript = history
    .map((turn) => `Human: ${turn.question}\nAssistant: ${turn.answer}`)
    .join('\n\n');
  const prompt = `Conversation so far:\n${transcript}\n\nLatest message: ${question}`;

  const response = await getModel().invoke([
    new SystemMessage(CONDENSE_SYSTEM_PROMPT),
    new HumanMessage(prompt),
  ]);

  const rewritten = extractText(response.content).trim();
  return rewritten || question;
}

export async function answerQuestion(
  question: string,
  contextChunks: string[],
  history: ConversationTurn[] = [],
  mode: 'qa' | 'summarization' = 'qa',
): Promise<string> {
  const context = contextChunks.map((chunk, i) => `[${i + 1}] ${chunk}`).join('\n\n');

  const userPrompt = `Context:\n${context}\n\nQuestion: ${question}`;
  const systemPrompt = mode === 'summarization' ? SUMMARIZATION_SYSTEM_PROMPT : SYSTEM_PROMPT;

  const response = await getModel().invoke([
    new SystemMessage(systemPrompt),
    ...historyToMessages(history),
    new HumanMessage(userPrompt),
  ]);

  return extractText(response.content);
}

/**
 * Answers a conversational message (greeting, thanks, meta question about
 * the assistant) with no document context and no retrieval - used for
 * intents that are routed around retrieval entirely.
 */
export async function answerConversationally(
  question: string,
  history: ConversationTurn[] = [],
): Promise<string> {
  const response = await getModel().invoke([
    new SystemMessage(CONVERSATIONAL_SYSTEM_PROMPT),
    ...historyToMessages(history),
    new HumanMessage(question),
  ]);

  return extractText(response.content);
}
