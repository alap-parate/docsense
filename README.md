<p align="center">
  <img align="center" src="https://github.com/alap-parate/docsense/blob/main/docs/logo.png" width="500" alt="DocSense logo">
</p>

<h1 align="center">
  DocSense
</h1>

DocSense is an early-stage **document intelligence platform** that transforms PDFs into searchable, queryable knowledge.

Users can upload PDFs, search across them efficiently, and ask natural-language questions that are answered using the actual document content via Retrieval Augmented Generation (RAG).

This project is functional and actively evolving, but **not yet horizontally scalable by design**. The focus is on correctness, clarity, and extensibility before large-scale optimization.

---

## Why DocSense

- PDFs are static and opaque
- Document-level search hides relevant context
- Keyword search alone is insufficient for real understanding
- Users want **answers**, not filenames or vague matches

DocSense treats documents as structured data pipelines, not blobs.

---

## What DocSense Does

### User & Workspace Management
- User authentication
- Workspace-based multi-tenancy
- Invite users to workspaces
- Workspace-scoped documents and search

### Document Ingestion
- PDF upload with asynchronous processing
- Immutable file storage
- Clear processing lifecycle and status tracking

### Document Processing Pipeline
- PDF → pages
- Pages → semantic chunks
- Page- and chunk-level isolation for retries and parallelism

### Search & Retrieval
- Page- and chunk-level full-text search using Elasticsearch
- Workspace-scoped search
- Fast, debuggable, rebuildable indexes

### Question Answering (RAG)
- Retrieve relevant chunks using search
- Generate answers grounded in document context
- Local LLM inference using Gemma models
- Embeddings generated once and reused

---

## Technology Stack

- **Backend**: NestJS
- **Queueing**: BullMQ + Redis
- **Database**: PostgreSQL
- **Search Engine**: Elasticsearch
- **LLMs & Embeddings**: Gemma (via Ollama)
- **Storage**: S3-compatible object storage (MinIO)

---

## Status

Active development.

DocSense is a foundation for scalable document intelligence, with future plans for hybrid search, improved chunking strategies, streaming answers, and distributed processing.
