# Design Decision & Tradeoffs

### Why asynchronous processing?
PDF parsing, text extraction, and indexing are CPU-heavy and unpredictable. Running them synchronously would make the API slow and fragile. Using BullMQ ensures responsiveness and controlled load.

---

### Why page-level indexing?
Document-level search hides context. Page-level indexing allows DocSense to:
- show exactly where text appears
- render results immediately
- support multi-page matches naturally

The tradeoff is a larger search index, which is acceptable.

---

### Why Elasticsearch and not SQL full-text search?
Relational full-text search struggles with:
- relevance tuning
- highlighting
- complex filtering

Elasticsearch excels at these and is treated strictly as a derived index, not a source of truth.

---

### Why not store extracted text in the database?
Extracted text is:
- large
- noisy
- rebuildable

Storing it permanently would duplicate responsibility and complicate migrations. Clean text lives only in the search index.

---

### Why lightweight NLP instead of embeddings?
Heavy NLP models increase:
- memory usage
- CPU load
- system complexity

Lightweight NLP provides most of the value (keywords, identifiers, tags) at a fraction of the cost. Semantic search is deferred to a later phase.

---

### Why not highlight text inside the PDF itself?
Mapping extracted text back to PDF coordinates is complex and unreliable without OCR and layout analysis. Instead, DocSense:
- highlights text in search snippets
- opens the PDF at the correct page

This provides clarity without fragile rendering logic.

---

### Why BullMQ instead of Kafka?
Kafka is powerful but operationally heavy. BullMQ provides exactly what DocSense needs:

- job queues
- retries
- backpressure
- simple deployment

Kafka can be introduced later if event streaming becomes a requirement.

---
