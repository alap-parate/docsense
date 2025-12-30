## System Flow Diagram

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as NestJS API
    participant DB as MariaDB
    participant Q as BullMQ
    participant W as Worker
    participant FS as File Storage
    participant ES as Elasticsearch

    U->>FE: Upload PDF
    FE->>API: POST /documents
    API->>FS: Save PDF file
    API->>DB: Create document (UPLOADED)
    API->>Q: Enqueue processing job
    API-->>FE: 202 Accepted

    Q->>W: Dequeue job
    W->>DB: Update status (PROCESSING)
    W->>FS: Read PDF
    W->>W: Extract & normalize text
    W->>ES: Index pages
    W->>DB: Update status (PROCESSED)


    participant U as User
    participant FE as Frontend
    participant API as NestJS API
    participant ES as Elasticsearch
    participant DB as MariaDB
    participant FS as File Storage

    U->>FE: Enter search query
    FE->>API: GET /search?q=...
    API->>ES: Page-level search + highlight
    ES-->>API: Matching pages
    API-->>FE: Page results

    FE->>API: Request PDF metadata
    API->>DB: Fetch document info
    API->>FS: Serve PDF file
    API-->>FE: PDF stream
    FE->>FE: Open PDF at matching page
