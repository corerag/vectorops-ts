import { ChatAnthropic } from '@langchain/anthropic';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import {
  INTENT_EXAMPLES,
  INTENT_MULTITURN_EXAMPLES,
  type IntentCategory,
  type IntentExample,
  type IntentMultiTurnExample,
} from '../../eval/intent-examples';
import type { ConversationTurn } from './conversation';

export type { IntentCategory };

const CATEGORIES: readonly IntentCategory[] = [
  'factual_lookup',
  'summarization',
  'out_of_scope',
  'conversational',
];

/**
 * Fallback when the model's response can't be parsed into a known category.
 * Fails open toward the pre-router behavior (always retrieve + answer)
 * rather than silently skipping retrieval on a parse error.
 */
const FALLBACK_CATEGORY: IntentCategory = 'factual_lookup';

function formatMultiTurnExample(example: IntentMultiTurnExample): string {
  const historyText = example.history.map((turn) => `Q: ${turn.question}\nA: ${turn.answer}`).join('\n');
  return `${historyText}\nFollow-up: "${example.followUp}" -> ${example.category}`;
}

function buildSystemPrompt(
  fewShotExamples: IntentExample[],
  multiTurnExamples: IntentMultiTurnExample[],
): string {
  const examples = fewShotExamples.map((example) => `"${example.text}" -> ${example.category}`).join('\n');
  const multiTurn = multiTurnExamples.map(formatMultiTurnExample).join('\n\n');

  return `You classify a user's message into exactly one of four intent categories, for a
question-answering assistant that searches a personal document collection (a resume and
professional certifications).

- factual_lookup: a specific fact answerable from one place in the documents (a date, title,
  certification, clearance detail, skill, or a direct "what/when/where is X" question about the
  person's actual background).
- summarization: asks for synthesis or an overview across multiple parts of the documents
  ("summarize", "overview", "walk me through", "TL;DR", or a generative request - like a cover
  letter - that must be grounded in the person's real background).
- out_of_scope: unrelated to these documents - general knowledge, questions about certifications
  or licenses in the abstract (not this person's own), generic non-personalized writing tasks, or
  anything else the documents can't answer.
- conversational: greetings, thanks, small talk, or meta questions about the assistant itself -
  carries no lookup content on its own.

Examples:
${examples}

Some messages are follow-ups in an ongoing conversation - when that's the case, the prior turns
are included as separate messages before the final one you're classifying. Use that history to
resolve pronouns and references ("the first one", "that", "before that") and to judge whether the
follow-up shifts to a different category than the previous turn did - e.g. a factual answer
followed by "give me the full picture" is summarization, not factual_lookup, and a real answer
followed by "thanks!" is conversational regardless of what came before it.

Examples with conversation history (classify only the follow-up):
${multiTurn}

Respond with exactly one word: factual_lookup, summarization, out_of_scope, or conversational.
No punctuation, no explanation, nothing else.`;
}

function historyToMessages(history: ConversationTurn[]) {
  return history.flatMap((turn) => [new HumanMessage(turn.question), new AIMessage(turn.answer)]);
}

// Built once and reused for the default (production) example set - it's the
// same on every call, so keeping it as a stable string (rather than
// rebuilding it per request) lets Anthropic's prompt cache actually hit
// across requests instead of hashing a freshly-allocated-but-identical
// string each time. Not used when a caller overrides the example set (see
// classifyIntent's `examples`/`multiTurnExamples` options), since that
// prompt varies per call.
let defaultSystemPrompt: string | null = null;
let model: ChatAnthropic | null = null;

function getModel(): ChatAnthropic {
  if (!model) {
    // Classification is a 4-way categorical decision gating retrieval, not a
    // task that needs the biggest model - Haiku at temperature 0 is cheaper
    // and faster, which matters since this runs on every query.
    model = new ChatAnthropic({ model: 'claude-haiku-4-5-20251001', temperature: 0 });
  }
  return model;
}

function parseCategory(raw: string): IntentCategory | null {
  const normalized = raw.trim().toLowerCase();
  return (CATEGORIES as readonly string[]).includes(normalized) ? (normalized as IntentCategory) : null;
}

export interface ClassifyIntentOptions {
  /**
   * Override the single-turn few-shot examples baked into the prompt.
   * Defaults to the full `INTENT_EXAMPLES` set (production behavior).
   *
   * Used by the leave-one-out eval (`intent-eval.ts`) so a held-out example
   * is never present in its own few-shot list - without this, evaluating
   * against `INTENT_EXAMPLES` would just test whether the model can copy
   * the label off an identical string already sitting in its own prompt,
   * not whether it generalizes to unseen phrasing.
   */
  examples?: IntentExample[];
  /** Same idea as `examples`, but for the multi-turn few-shot examples. */
  multiTurnExamples?: IntentMultiTurnExample[];
  /**
   * The real conversation history preceding `question`, if any - included
   * as actual prior turns (not just prompt examples) so the model can
   * resolve pronouns/references and judge category shifts the same way the
   * multi-turn few-shot examples demonstrate. Defaults to no history
   * (single-turn classification).
   */
  history?: ConversationTurn[];
}

export async function classifyIntent(
  question: string,
  options: ClassifyIntentOptions = {},
): Promise<IntentCategory> {
  let prompt: string;
  if (options.examples || options.multiTurnExamples) {
    prompt = buildSystemPrompt(options.examples ?? INTENT_EXAMPLES, options.multiTurnExamples ?? INTENT_MULTITURN_EXAMPLES);
  } else {
    if (!defaultSystemPrompt) defaultSystemPrompt = buildSystemPrompt(INTENT_EXAMPLES, INTENT_MULTITURN_EXAMPLES);
    prompt = defaultSystemPrompt;
  }

  // cache_control applies a cache breakpoint to the last cacheable block in
  // the request - here that's normally the (static, ~150-example) system
  // prompt, so repeated classify calls only pay full input-token cost once.
  // Only effective for the default example set with no history, since an
  // overridden example set or non-empty history varies per call and never
  // repeats.
  const response = await getModel().invoke(
    [new SystemMessage(prompt), ...historyToMessages(options.history ?? []), new HumanMessage(question)],
    { cache_control: { type: 'ephemeral' } },
  );

  const text = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
  const category = parseCategory(text);

  if (!category) {
    console.error(`classifyIntent: could not parse category from model response: ${JSON.stringify(text)}`);
    return FALLBACK_CATEGORY;
  }

  return category;
}
