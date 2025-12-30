# DocSense

DocSense is a document intelligence platform that allows users to upload PDFs, process them asynchronously, and perform **page-level full-text search with immediate context rendering**.

Instead of returning only document-level matches, DocSense resolves search queries directly to the **exact pages** where the text appears and renders them instantly in a split-view document viewer.

The system is designed to be:
- asynchronous by default
- resilient to failures
- deployable on modest infrastructure

---

## Core Features

- User authentication (register, login)
- PDF upload with non-blocking processing
- Asynchronous document processing via job queues
- Page-level text extraction and indexing
- Full-text search with highlighted snippets
- Immediate page rendering for search results
- Tagging and tag-based search
- Graceful handling of unprocessable PDFs
- Processing progress visibility

---

## High-Level Architecture

DocSense follows a **derived-data architecture**:

- Relational database stores authoritative truth
- Search engine stores rebuildable search views
- Workers perform all heavy processing asynchronously
- API layer never blocks on CPU-intensive tasks

User → API → Queue → Worker → Search Index
↓
Metadata DB


---

## Architecture Components

### API Layer (NestJS)

Responsible for:
- authentication and authorization
- accepting PDF uploads
- persisting document metadata
- enqueueing background jobs
- exposing search and progress endpoints

The API **never performs PDF processing directly**.

---

### Database (MariaDB – Source of Truth)

Stores:
- users
- document metadata
- processing status
- page counts
- tags and ownership

Does **not** store extracted page text.

MariaDB answers:
- What exists?
- Who owns it?
- What state is it in?

---

### Job Queue (BullMQ + Redis)

Provides:
- asynchronous document processing
- backpressure and concurrency control
- retries and failure isolation

Upload flow:
1. Save metadata
2. Enqueue processing job
3. Respond immediately

---

### Worker Layer

Workers are isolated processes that:
- read PDF files
- extract text page-by-page
- clean and normalize text
- apply lightweight NLP
- index pages into Elasticsearch
- update progress and status

Failures are contained and visible.

---

### Text Processing & NLP

Extracted PDF text is **never indexed raw**.

Processing includes:
- whitespace and line normalization
- hyphenation fixes
- header/footer removal
- control character cleanup

Lightweight NLP is applied to:
- extract keywords
- detect identifiers (invoice numbers, references)
- extract simple entities (dates, amounts)
- suggest tags

This improves search quality without heavy ML models.

---

### Search Engine (Elasticsearch)

Stores **derived search data only**.

Each Elasticsearch document represents:
- a single PDF page
- cleaned text
- page number
- document reference
- ownership metadata
- mirrored tags
- extracted identifiers

Elasticsearch provides:
- full-text search
- relevance scoring
- highlighted snippets

The index is fully rebuildable.

---

### Frontend (React)

The frontend is a dashboard-style UI with:
- document management
- upload and progress tracking
- a search-driven split view:
  - left pane: matching pages with highlights
  - right pane: PDF viewer opened at the matching page

Search acts as **navigation**, not just discovery.

---
