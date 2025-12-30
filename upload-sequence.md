```mermaid
sequenceDiagram
    autonumber

    participant U as User
    participant FE as Frontend
    participant API as NestJS API
    participant FS as File Storage
    participant DB as MariaDB
    participant Q as BullMQ
    participant W as Worker
    participant ES as Elasticsearch

    %% Upload
    U->>FE: Select & upload PDF
    FE->>API: POST /documents (multipart PDF)

    API->>FS: Persist raw PDF file
    FS-->>API: File path / storage key

    API->>DB: Create Document record
    Note right of DB: status = UPLOADED

    API->>Q: Enqueue ProcessDocument job
    Note right of Q: job contains documentId

    API-->>FE: 202 Accepted + documentId

    %% Async boundary
    Note over FE,API: Request lifecycle ends here

    %% Worker processing
    Q->>W: Dequeue ProcessDocument job

    W->>DB: Update status
    Note right of DB: status = PROCESSING

    W->>FS: Read PDF file
    FS-->>W: PDF binary stream

    W->>W: Extract text per page
    W->>W: Normalize text (cleanup, de-hyphenation)

    W->>W: Apply lightweight NLP
    Note right of W: keywords, identifiers, entities

    W->>ES: Bulk index pages
    Note right of ES: one ES doc = one PDF page

    W->>DB: Update document metadata
    Note right of DB: status = PROCESSED, pageCount

    %% Failure path (implicit)
    Note over W,DB: On failure → status = FAILED + reason
