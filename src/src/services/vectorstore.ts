import fs from 'fs/promises';
import path from 'path';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import { Document } from '@langchain/core/documents';
import { LocalHashEmbeddings } from './localEmbeddings';

export interface SimilarityMatch {
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

/** On-disk shape for one persisted chunk: its text, embedding, and metadata. */
interface PersistedVector {
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}

export interface VectorStoreServiceOptions {
  /**
   * Where to persist chunks + embeddings as JSON, so they survive a
   * restart. Defaults to `<project root>/data/vectorstore.json`.
   *
   * Pass `null` to disable persistence entirely (in-memory only, nothing
   * written to or read from disk) - used by the retrieval eval harness so
   * fixture runs never touch the real store on disk.
   */
  persistPath?: string | null;
}

const DEFAULT_PERSIST_PATH = path.resolve(__dirname, '../../../data/vectorstore.json');

export class VectorStoreService {
  private store: MemoryVectorStore;
  private readonly persistPath: string | null;

  constructor(options: VectorStoreServiceOptions = {}) {
    this.store = new MemoryVectorStore(new LocalHashEmbeddings());
    this.persistPath = options.persistPath === undefined ? DEFAULT_PERSIST_PATH : options.persistPath;
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
    await this.save();
  }

  async similaritySearch(query: string, k: number): Promise<SimilarityMatch[]> {
    const results = await this.store.similaritySearchWithScore(query, k);
    return results.map(([doc, score]) => ({ content: doc.pageContent, score, metadata: doc.metadata }));
  }

  /** Writes every chunk and its already-computed embedding to disk. No-op if persistence is disabled. */
  async save(): Promise<void> {
    if (!this.persistPath) return;

    const records: PersistedVector[] = this.store.memoryVectors.map((vector) => ({
      content: vector.content,
      embedding: vector.embedding,
      metadata: vector.metadata,
    }));

    await fs.mkdir(path.dirname(this.persistPath), { recursive: true });
    await fs.writeFile(this.persistPath, JSON.stringify(records), 'utf-8');
  }

  /**
   * Loads chunks + embeddings previously written by `save()`, if any exist.
   * Embeddings are reused as-is - nothing gets re-embedded. Call once at
   * startup, before serving requests. No-op if persistence is disabled or
   * no file has been written yet.
   */
  async load(): Promise<void> {
    if (!this.persistPath) return;

    let raw: string;
    try {
      raw = await fs.readFile(this.persistPath, 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }

    const records: PersistedVector[] = JSON.parse(raw);
    if (records.length === 0) return;

    const documents = records.map((r) => new Document({ pageContent: r.content, metadata: r.metadata }));
    const vectors = records.map((r) => r.embedding);
    await this.store.addVectors(vectors, documents);
  }
}
