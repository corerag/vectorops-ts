import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import { Document } from '@langchain/core/documents';
import { LocalHashEmbeddings } from './localEmbeddings';

export interface SimilarityMatch {
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

export class VectorStoreService {
  private store: MemoryVectorStore;

  constructor() {
    this.store = new MemoryVectorStore(new LocalHashEmbeddings());
  }

  /**
   * Chunk metadata is optional and positional (metadata[i] describes chunks[i]).
   * Used by the retrieval evaluation harness to tag chunks with an id so
   * retrieved results can be checked against a ground-truth answer key.
   */
  async addChunks(chunks: string[], metadata?: Record<string, unknown>[]): Promise<void> {
    const documents = chunks.map(
      (chunk, i) => new Document({ pageContent: chunk, metadata: metadata?.[i] ?? {} }),
    );
    await this.store.addDocuments(documents);
  }

  async similaritySearch(query: string, k: number): Promise<SimilarityMatch[]> {
    const results = await this.store.similaritySearchWithScore(query, k);
    return results.map(([doc, score]) => ({ content: doc.pageContent, score, metadata: doc.metadata }));
  }
}
