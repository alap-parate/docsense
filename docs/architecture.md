# DocSense Architecture

> **DocSense is an asynchronous document processing and retrieval system**
> designed to resolve search queries directly to page-level context.

This document describes **how the system is structured**, how responsibilities
are divided, and how data flows through the platform.

---

## 🧠 Architectural Overview

DocSense is built as an **asynchronous document processing and search system**.

All CPU-intensive work (PDF parsing, text processing, NLP, indexing) is executed
**outside the HTTP request lifecycle**.  
The API layer remains responsive and orchestration-focused at all times.

Key architectural characteristics:

- Asynchronous by default
- Clear separation of responsibilities
- Search data treated as derived, rebuildable state
- Designed to run on modest infrastructure

---

## 🧩 Core Components

### API Layer (NestJS)

The API layer acts as the **control plane** of the system.

**Responsibilities**
- Authentication and authorization
- PDF upload handling
- Job orchestration
- Search endpoints
- Progress and status reporting

The API **never performs PDF processing directly**.

---

### Worker Layer

Workers are isolated background processes responsible for all heavy computation.

**Responsibilities**
- PDF text extraction
- Text normalization and cleanup
- NLP enrichment
- Indexing into Elasticsearch
- Progress reporting and state updates

Worker failures are contained and do not affect API availability.

---

## 💾 Data Storage

### MariaDB — *Source of Truth*

MariaDB stores **authoritative system data**.

**Stores**
- Users
- Document metadata
- Processing status
- Tags and ownership

**Does NOT store**
- Extracted page text
- Search blobs

MariaDB answers questions like:
> *What exists? Who owns it? What state is it in?*

---

### Elasticsearch — *Derived Search Index*

Elasticsearch stores **derived, rebuildable search data**.

Each Elasticsearch document represents:
- One PDF page
- Cleaned and normalized text
- Page number
- Highlightable content
- Extracted identifiers
- Mirrored tags

The index is **fully rebuildable** from MariaDB and stored PDFs.

Elasticsearch answers:
> *Where does this text appear, and why does it match?*

---

## 🔄 Processing Pipeline

Upload → Queue → Worker → Index


1. A PDF is uploaded and metadata is stored
2. A processing job is enqueued
3. A worker extracts, processes, and enriches text
4. Pages are indexed into Elasticsearch

📎 *See:* [`upload-sequence`](https://github.com/alap-parate/docsense/blob/main/docs/diagrams/upload-sequence.md) diagram

---

## 🔍 Search & Page Resolution

DocSense is **page-first**, not document-first.

- All search results resolve to **pages**
- Pages are rendered **immediately**
- Multiple matching pages are shown without requiring clicks
- Highlighted snippets explain *why* a page matched

Search acts as **navigation**, not just discovery.

📎 *See:* [`search-sequence`](https://github.com/alap-parate/docsense/blob/main/docs/diagrams/search-sequence.md) diagram

---

## ⚠️ Failure Handling

Failures are treated as **explicit system states**, not hidden exceptions.

- Failed documents remain visible
- Original files are preserved
- Tags can still be applied
- Status and failure reasons are observable

The system degrades gracefully without data loss.

---

## 🚀 Deployment Model

DocSense is designed to run on a **single VPS**.

- Single-host deployment
- Isolated services
- Containerized via Docker Compose

This model favors:
- operational simplicity
- reproducibility
- solo-developer maintainability

---

## 🎛 Frontend (React)

The frontend is a **dashboard-style application** designed around fast context resolution.

Key characteristics:
- Document management and upload views
- Real-time processing status visibility
- Search-driven split view:
  - **Left pane:** matching pages with highlighted snippets
  - **Right pane:** PDF viewer opened at the matching page

Search is treated as **navigation**, not exploration.

---

## ✨ Architectural Principle

> **The system always moves the user closer to the answer, not the file.**

DocSense is designed to surface *context immediately* while keeping
processing, indexing, and storage concerns cleanly separated.
