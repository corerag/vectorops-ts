import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

const SYSTEM_PROMPT = `You are a helpful assistant answering questions using only the provided context.
If the context doesn't contain the answer, say you don't know instead of guessing.`;

let model: ChatAnthropic | null = null;

function getModel(): ChatAnthropic {
  if (!model) {
    model = new ChatAnthropic({ model: 'claude-opus-5' });
  }
  return model;
}

export async function answerQuestion(question: string, contextChunks: string[]): Promise<string> {
  const context = contextChunks.map((chunk, i) => `[${i + 1}] ${chunk}`).join('\n\n');

  const userPrompt = `Context:\n${context}\n\nQuestion: ${question}`;

  const response = await getModel().invoke([
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(userPrompt),
  ]);

  return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
}
