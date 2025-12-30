```mermaid
sequenceDiagram
    autonumber

    participant U as User
    participant FE as Frontend
    participant API as NestJS API
    participant ES as Elasticsearch
    participant DB as MariaDB
    participant FS as File Storage

    %% Search
    U->>FE: Enter search query (e.g. INV-2025)
    FE->>API: GET /search?q=INV-2025

    API->>ES: Page-level full-text search
    Note right of ES: filters: ownerId, tags
    Note right of ES: highlight enabled

    ES-->>API: Matching pages + highlights
    Note left of API: documentId, pageNumber, snippet

    API-->>FE: Page-level results

    %% Immediate rendering
    FE->>FE: Select first page result (auto)

    FE->>API: GET /documents/{id}/metadata
    API->>DB: Fetch document info
    DB-->>API: Document metadata
    API-->>FE: Metadata response

    FE->>API: GET /documents/{id}/file
    API->>FS: Stream PDF file
    FS-->>API: PDF stream
    API-->>FE: PDF stream

    FE->>FE: Open PDF at pageNumber
    Note right of FE: Highlight shown via snippet

    %% Multi-page behavior
    Note over FE: Switching pages reuses same PDF stream
