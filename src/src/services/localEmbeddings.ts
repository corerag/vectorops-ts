import { Embeddings, type EmbeddingsParams } from '@langchain/core/embeddings';

const DIMENSIONS = 512;

function hashToken(token: string): number {
  let hash = 5381;
  for (let i = 0; i < token.length; i++) {
    hash = ((hash << 5) + hash + token.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function normalize(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (magnitude === 0) return vector;
  return vector.map((value) => value / magnitude);
}

/**
 * Deterministic feature-hashing embedding (no API key, no network calls).
 * Captures keyword overlap via the hashing trick, not real semantic meaning -
 * a stand-in for a proper embeddings model until one is wired up.
 */
export class LocalHashEmbeddings extends Embeddings {
  constructor(params: EmbeddingsParams = {}) {
    super(params);
  }

  private embed(text: string): number[] {
    const vector = new Array(DIMENSIONS).fill(0);
    for (const token of tokenize(text)) {
      const index = hashToken(token) % DIMENSIONS;
      vector[index] += 1;
    }
    return normalize(vector);
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    return documents.map((doc) => this.embed(doc));
  }

  async embedQuery(document: string): Promise<number[]> {
    return this.embed(document);
  }
}
