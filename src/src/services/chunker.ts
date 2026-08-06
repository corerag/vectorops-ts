import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

export class DocumentChunker {
  private splitter: RecursiveCharacterTextSplitter;

  constructor(chunkSize: number = 500, chunkOverlap: number = 50) {
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
    });
  }

  async chunkText(text: string): Promise<string[]> {
    const chunks = await this.splitter.splitText(text);
    return chunks;
  }
}
