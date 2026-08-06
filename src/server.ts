import path from 'path';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { DocumentChunker } from './src/services/chunker';
import { VectorStoreService } from './src/services/vectorstore';
import { answerQuestion } from './src/services/qa';

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

const PORT = process.env.PORT || 3000;
const chunker = new DocumentChunker();
const vectorStore = new VectorStoreService();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'VectorOps TS is running' });
});

app.post('/upload', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "text" field in request body' });
    }

    const chunks = await chunker.chunkText(text);
    await vectorStore.addChunks(chunks);

    res.json({ message: 'Document chunked and embedded successfully', chunkCount: chunks.length, chunks });
  } catch (error) {
    console.error('Error processing upload:', error);
    res.status(500).json({ error: 'Failed to process document' });
  }
});

app.post('/query', async (req, res) => {
  try {
    const { question, k } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "question" field in request body' });
    }

    const topK = typeof k === 'number' && k > 0 ? k : 4;
    const matches = await vectorStore.similaritySearch(question, topK);

    if (matches.length === 0) {
      return res.json({
        answer: "I don't have any documents to search yet. Upload something first via /upload.",
        sources: [],
      });
    }

    const answer = await answerQuestion(question, matches.map((m) => m.content));

    res.json({
      answer,
      sources: matches.map((m) => ({ content: m.content, score: m.score })),
    });
  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({ error: 'Failed to process query' });
  }
});

async function main() {
  await vectorStore.load();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
