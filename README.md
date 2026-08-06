# VectorOps TS

A minimal Retrieval-Augmented Generation (RAG) service built with TypeScript, Express, and Claude. Upload a document, ask questions about it, and get answers grounded in the retrieved context — with no external embedding API required.

## How it works

1. **Upload** — `POST /upload` splits a document into overlapping chunks and stores them in an in-memory vector store, indexed by a locally-computed embedding for each chunk.
2. **Query** — `POST /query` embeds your question the same way, retrieves the most similar chunks, and passes them to Claude as context to generate an answer.

Embeddings are computed locally with a deterministic hashing-trick implementation (tokenize → hash into buckets → normalize) rather than calling an external embeddings API. This keeps the retrieval side fully free and offline — the only external call is to the Claude API when generating an answer.

> Local hash-based embeddings capture keyword overlap, not deep semantic meaning. They're a solid way to test the pipeline end-to-end; swapping in a real embedding model (local or hosted) is a natural next step if retrieval quality needs to improve.

## Tech stack

- **[Express](https://expressjs.com/)** — HTTP server
- **[LangChain](https://js.langchain.com/)** (`@langchain/core`, `@langchain/classic`, `@langchain/textsplitters`) — text chunking and in-memory vector store
- **[@langchain/anthropic](https://www.npmjs.com/package/@langchain/anthropic)** — Claude integration for answer generation
- **TypeScript** with `ts-node` for direct execution (no build step required in development)
- **dotenv** — environment variable loading

## Project structure

```
vectorops-ts/
├── src/
│   ├── server.ts                        # Express app: routes and wiring
│   ├── .env                             # Local environment variables (not committed)
│   ├── test-upload.js                   # Manual smoke test for POST /upload
│   ├── test-query.js                    # Manual smoke test for POST /query
│   ├── eval/
│   │   ├── dataset.ts                   # Fixture documents + questions with ground-truth answers
│   │   ├── metrics.ts                   # Hit rate, MRR, precision/recall, score separation
│   │   └── retrieval-eval.ts            # Runs the eval and prints a report (npm run eval)
│   └── src/
│       └── services/
│           ├── chunker.ts               # Document chunking (RecursiveCharacterTextSplitter)
│           ├── localEmbeddings.ts       # Local hash-based embeddings (no API key needed)
│           ├── vectorstore.ts           # In-memory vector store wrapper
│           └── qa.ts                    # Sends retrieved context + question to Claude
├── package.json
└── tsconfig.json
```

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- An [Anthropic API key](https://console.anthropic.com/) with available credits

## Setup

1. Clone the repo and install dependencies:

   ```bash
   git clone https://github.com/coffeyaveryon-spec/vectorops-ts.git
   cd vectorops-ts
   npm install --legacy-peer-deps
   ```

2. Create `src/.env` with your Anthropic API key:

   ```env
   PORT=3000
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```

3. Start the server:

   ```bash
   npm run dev
   ```

   The server starts on `http://localhost:3000`.

## API

### `GET /health`

Health check.

```json
{ "status": "ok", "message": "VectorOps TS is running" }
```

### `POST /upload`

Chunks a document and embeds it into the in-memory vector store.

**Request body:**

```json
{ "text": "The document text to ingest..." }
```

**Response:**

```json
{
  "message": "Document chunked and embedded successfully",
  "chunkCount": 2,
  "chunks": ["...", "..."]
}
```

### `POST /query`

Retrieves the most relevant chunks for a question and asks Claude to answer using them.

**Request body:**

```json
{ "question": "What does this document say about X?", "k": 4 }
```

`k` (optional) controls how many chunks are retrieved; defaults to 4.

**Response:**

```json
{
  "answer": "...",
  "sources": [{ "content": "...", "score": 0.42 }]
}
```

## Manual testing

With the server running, the included scripts exercise the two endpoints against `localhost:3000`:

```bash
node src/test-upload.js
node src/test-query.js
```

## Retrieval evaluation

`npm run eval` runs a self-contained retrieval-quality check: it loads a fixture corpus of 12 short documents into a fresh vector store, runs 13 test questions (each with a known-correct answer) through the same `similaritySearch()` path `/query` uses, and scores how well retrieval performed.

```bash
npm run eval               # evaluate top-4 retrieval (matches /query's default)
npm run eval -- --k=6      # evaluate a different top-k cutoff
```

This only exercises embeddings + vector search — it never calls Claude, so it runs fully offline with no API key needed and no cost.

**Metrics reported, per question and in aggregate:**

| Metric | What it answers |
| --- | --- |
| Hit Rate@k | Did at least one relevant chunk show up in the top k results? |
| Mean Reciprocal Rank (MRR) | Did the relevant chunk rank *first*, or was it buried lower in the results? |
| Precision@k | Of the chunks retrieved, what fraction were actually relevant? |
| Recall@k | Of all the relevant chunks that exist, what fraction did we retrieve? |
| Score separation | Do relevant chunks score meaningfully higher than irrelevant ones, or is the embedding not really distinguishing them? |

The report ends by calling out exactly which questions failed to retrieve a relevant chunk, so a regression (e.g. from tweaking the chunker, the embedding, or `k`) is easy to spot.

To test against your own questions, edit `src/eval/dataset.ts` — add a document to `EVAL_DOCUMENTS` and a question with its correct document id(s) to `EVAL_QUESTIONS`. `metrics.ts` is a set of small pure functions if you want to add a metric.

## Notes

- The vector store is **in-memory only** — it resets whenever the server restarts. There's no persistence layer yet.
- `src/.env` is git-ignored; never commit real API keys.
