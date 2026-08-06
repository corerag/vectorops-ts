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

## Notes

- The vector store is **in-memory only** — it resets whenever the server restarts. There's no persistence layer yet.
- `src/.env` is git-ignored; never commit real API keys.
