import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import { Document } from '@langchain/core/documents';
import { LocalHashEmbeddings } from './localEmbeddings';

export interface SimilarityMatch {
  content: string;
  score: number;
}

export class VectorStoreService {
  private store: MemoryVectorStore;

  constructor() {
    this.store = new MemoryVectorStore(new LocalHashEmbeddings());
  }

  async addChunks(chunks: string[]): Promise<void> {
    const documents = chunks.map((chunk) => new Document({ pageContent: chunk }));
    await this.store.addDocuments(documents);
  }

  async similaritySearch(query: string, k: number): Promise<SimilarityMatch[]> {
    const results = await this.store.similaritySearchWithScore(query, k);
    return results.map(([doc, score]) => ({ content: doc.pageContent, score }));
  }
}
