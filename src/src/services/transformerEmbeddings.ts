import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';
import { Embeddings, type EmbeddingsParams } from '@langchain/core/embeddings';

/**
 * all-MiniLM-L6-v2: a small, widely-used open-weight sentence-embedding
 * model (384 dimensions). Good general-purpose semantic similarity for its
 * size, and small enough to run comfortably on CPU.
 */
const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

// The pipeline downloads and loads the ONNX model on first use, so it's
// created lazily and cached module-wide - every VectorStoreService instance
// shares one model load instead of paying startup cost per instance.
let pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

function getPipeline(): Promise<FeatureExtractionPipeline> {
  if (!pipelinePromise) {
    pipelinePromise = pipeline('feature-extraction', MODEL_ID);
  }
  return pipelinePromise;
}

/**
 * Real sentence embeddings via a local, open-weight model running fully
 * on-device through transformers.js (ONNX Runtime) - no API key, no
 * network calls once the model is downloaded and cached on first use
 * (~90MB, cached under the OS-default Hugging Face cache directory).
 *
 * Unlike LocalHashEmbeddings (keyword overlap via hashing), this captures
 * actual semantic similarity - "how do I reset my password" and "forgot
 * password steps" will score as related even with no shared words.
 */
export class TransformerEmbeddings extends Embeddings {
  /** Identifies which model produced a set of embeddings, for persistence compatibility checks. */
  readonly modelId = MODEL_ID;

  constructor(params: EmbeddingsParams = {}) {
    super(params);
  }

  private async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const extractor = await getPipeline();
    const output = await extractor(texts, { pooling: 'mean', normalize: true });
    return output.tolist();
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    return this.embed(documents);
  }

  async embedQuery(document: string): Promise<number[]> {
    const [vector] = await this.embed([document]);
    if (!vector) {
      throw new Error('Embedding pipeline returned no result for query');
    }
    return vector;
  }
}
