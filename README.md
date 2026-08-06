# VectorOps TS

A minimal Retrieval-Augmented Generation (RAG) service built with TypeScript, Express, and Claude. Upload a document, ask questions about it, and get answers grounded in the retrieved context — with no external embedding API required.

## How it works

1. **Upload** — `POST /upload` splits a document into overlapping chunks, embeds each one locally, and stores them in an in-memory vector store. Every upload is immediately persisted to `data/vectorstore.json`.
2. **Query** — `POST /query` embeds your question the same way, retrieves the most similar chunks, and passes them to Claude as context to generate an answer. Pass a `session_id` to make follow-up questions work naturally (see [Conversational memory](#conversational-memory)).

Embeddings are computed locally by [all-MiniLM-L6-v2](https://huggingface.co/Xenova/all-MiniLM-L6-v2), a small open-weight sentence-embedding model running on-device via [transformers.js](https://huggingface.co/docs/transformers.js) (ONNX Runtime, CPU) — real semantic similarity, not just keyword matching, with no API key and no per-request cost. The model (~90MB) downloads from Hugging Face on first use and is cached locally afterward, so only the very first run needs network access for this part. The only per-request external call is to the Claude API when generating an answer.

## Tech stack

- **[Express](https://expressjs.com/)** — HTTP server
- **[LangChain](https://js.langchain.com/)** (`@langchain/core`, `@langchain/classic`, `@langchain/textsplitters`) — text chunking and in-memory vector store
- **[@huggingface/transformers](https://huggingface.co/docs/transformers.js)** — local embedding model (all-MiniLM-L6-v2) for retrieval
- **[@langchain/anthropic](https://www.npmjs.com/package/@langchain/anthropic)** — Claude integration for answer generation
- **TypeScript** with `ts-node` for direct execution (no build step required in development)
- **dotenv** — environment variable loading

## Project structure

```
vectorops-ts/
├── public/
│   ├── index.html                       # Single-page UI: upload + ask
│   ├── style.css                        # Dark theme
│   └── app.js                           # Fetch calls to /upload and /query, no framework
├── src/
│   ├── server.ts                        # Express app: routes, static file serving, wiring
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
│           ├── transformerEmbeddings.ts # Local semantic embeddings (all-MiniLM-L6-v2, no API key needed)
│           ├── vectorstore.ts           # Vector store wrapper + JSON persistence
│           ├── conversation.ts          # In-memory chat history, keyed by session id
│           └── qa.ts                    # Question condensing + sends context/history to Claude
├── data/
│   └── vectorstore.json                 # Persisted chunks + embeddings (created on first upload, not committed)
├── package.json
└── tsconfig.json
```

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- An [Anthropic API key](https://console.anthropic.com/) with available credits
- Network access on first run only, to download the ~90MB embedding model (cached locally afterward)

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

   The server starts on `http://localhost:3000`. Open that URL in a browser for the UI, or use the API directly.

## Frontend

A single-page UI is served at `/` — no build step, no framework, just static HTML/CSS/JS served directly by Express from `public/`. Two panels:

- **Upload a document** — paste text, click Upload. Shows the resulting chunk count or an error.
- **Ask a question** — type a question, click Ask (or press Enter). Answers appear in a running conversation transcript, each with its source chunks (collapsed behind a "Sources" disclosure) and similarity scores. Every question in the transcript shares one `session_id`, generated client-side and reused for the tab, so follow-ups build on what came before. **New conversation** clears the transcript and starts a fresh `session_id`.

A status indicator in the header pings `/health` on load so you can tell at a glance whether the API is reachable. All content from the API (uploaded text echoed back, Claude's answer, source chunks) is HTML-escaped before being inserted into the page.

## API

### `GET /health`

Health check.

```json
{ "status": "ok", "message": "VectorOps TS is running" }
```

### `POST /upload`

Chunks a document, embeds it, and adds it to the vector store. The updated store is written to `data/vectorstore.json` before the response is returned.

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
{ "question": "What does this document say about X?", "k": 4, "session_id": "abc-123" }
```

- `k` (optional) controls how many chunks are retrieved; defaults to 4.
- `session_id` (optional) — an opaque string identifying the conversation. When present, this question is answered with the benefit of prior turns from the same `session_id` (see [Conversational memory](#conversational-memory)). Omit it for a one-off, stateless question.

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

`test-query.js` asks a question, then a pronoun-only follow-up sharing the same `session_id`, to demonstrate conversational memory - run `test-upload.js` (or upload something relevant) first.

## Retrieval evaluation

`npm run eval` runs a self-contained retrieval-quality check: it loads a fixture corpus of 12 short documents into a fresh vector store, runs 13 test questions (each with a known-correct answer) through the same `similaritySearch()` path `/query` uses, and scores how well retrieval performed.

```bash
npm run eval               # evaluate top-4 retrieval (matches /query's default)
npm run eval -- --k=6      # evaluate a different top-k cutoff
```

This only exercises embeddings + vector search — it never calls Claude, so it needs no API key and has no per-run cost (the first run downloads the embedding model, same as the server).

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

## Persistence

The vector store lives in memory while the server runs, but every `/upload` immediately writes the full store — chunk text, embedding, and metadata for every chunk — to `data/vectorstore.json`. On startup, the server reads that file back in before it starts accepting requests, reusing the saved embeddings rather than recomputing them. Restarting the server (or a crash) doesn't lose uploaded documents.

This is a flat JSON file, not a database — fine for local development and demos, but it rewrites the entire file on every upload with no locking, so it isn't meant for concurrent writers or large corpora. Delete `data/vectorstore.json` (or the whole `data/` directory) to reset the store.

Each save is tagged with the embedding model that produced it. If you change the embedding model, the server detects the mismatch on startup, logs a warning, and starts with an empty store instead of loading vectors from a different embedding space (which would silently corrupt similarity search) — re-upload your documents to rebuild it.

The retrieval evaluation harness (`npm run eval`) explicitly disables persistence for its own store, so running it never reads or overwrites your real uploaded data.

## Conversational memory

Passing a `session_id` on `/query` makes follow-up questions work the way you'd expect — ask "What is RAG?", then "How does it compare to fine-tuning?", and the second question is understood in light of the first, even though "it" never says "RAG" anywhere.

This requires more than just handing Claude the chat history. Retrieval runs *before* Claude sees anything - the question gets embedded and matched against the vector store on its own. A pronoun-only follow-up embeds poorly in isolation, so on any question after the first in a session, it's first rewritten into a standalone question using the prior turns ("How does it compare to fine-tuning?" → "How does RAG compare to fine-tuning?"), *then* that rewritten version is used for retrieval. The answer step gets both the original question and the full conversation history, so it responds naturally rather than re-explaining a rewritten question the user didn't actually ask.

Two Claude calls happen per follow-up question (rewrite, then answer) instead of one — the first turn in a session only needs one call, since there's nothing yet to rewrite against.

History is kept **in memory only**, in a `Map` keyed by `session_id`, capped at the last 10 turns per session (older turns are dropped, not summarized). It is not persisted to disk and does not survive a server restart — unlike the vector store, which is. There's no session expiry, so a long-running server accumulates one history entry per distinct `session_id` it's seen; fine for local use, worth knowing about before exposing this publicly.

## Notes

- `data/` is git-ignored — persisted documents are local runtime state, not something to commit.
- `src/.env` is git-ignored; never commit real API keys.
