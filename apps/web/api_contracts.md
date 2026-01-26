## Core Domain Boundaries
The system has four parts :
- Authentication & Tenant context
- Files Management
- Processing Pipeline
- Search & Retrieval

## Global Conventions
- Every request is tenant-scoped
- IDs are opaque(UUIDs)
- Async worker returns a jobId, not results
- No file bytes are going through DB - only through MinIO/S3
- All endpoints are versioned under `/api/v1/`

### Headers
> ***Authorization***: **Bearer {jwt}**

### Success Response Shape
```json
{
    "data": {
        "id": "uuid",
        "name": "statement.pdf",
        "status": "READY"
    },
    "meta": {
        "requestId": "req_abc123",
        "pagination": {
            "limit": 10,
            "offset": 0,
            "total": 44
        }
    },
    "error": null
}
```

### Error Response Shape
```json
{
    "data": null,
    "meta": {
        "requestId": "req_abc123"
    }
    "error": {
        "code": "FILE_NOT_READY",
        "message": "File has not finished processing",
        "details": [
            "fileId": "uuid",
            "currentStatus": "PROCESSING"
        ]
    }
}
```

### Form Error Response Shape
```json
{
    "data": null,
    "meta": {
        "requestId": "req_abc123"
    }
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Request validation failed",
        "details": {
            "fields": [
                {
                    "field": "fileName",
                    "code": "REQUIRED",
                    "message": "File name must not be empty"
                },
                {
                    "field": "tag",
                    "code": "TOO_SMALL",
                    "message": "Tag name must be minimum four characters"
                }
            ]
        }
    }
}
```

# 1. Auth

## Sync User (Supabase Webhook)
> POST /api/v1/auth/sync

**Description**: Syncs a user from Supabase auth into the local database. Called after Supabase login (e.g. from Supabase Auth webhook or client immediately after sign-in). All other protected routes only look up the user; they do not sync.

**Headers**
```
Authorization: Bearer <supabase_access_token>
```

**Response**
```json
{
    "data": {
        "id": "uuid",
        "email": "user@example.com"
    }
}
```

# 2. Workspace (Tenants)

## Create Workspace
> POST /api/v1/workspace

**Request**
```json
{
    "name": "Acme Inc"
}
```

**Response**
```json
{
    "data": {
        "id": "uuid",
        "name": "Acme Inc",
        "createdAt": "2025-01-01T10:00:00Z"
    }
}
```

## List Workspaces
> GET /api/v1/workspace?page=1&limit=10

**Response**
```json
{
    "data": {
        "workspaces": [
            {
                "id": "uuid",
                "name": "Acme Inc",
                "status": "ACTIVE",
                "createdAt": "2025-01-01T10:00:00Z",
                "createdBy": "Alap Parate",
                "createdByMail": "parateforu@gmail.com"
            }
        ],
        "pagination": {
            "page": 1,
            "limit": 10,
            "total": 1
        }
    }
}
```

## List Workspace Users
> GET /api/v1/workspace/users?workspaceId=<uuid>&page=1&limit=10

**Response**
```json
{
    "data": {
        "users": [
            {
                "id": "uuid",
                "email": "user@example.com",
                "role": "OWNER",
                "status": "ACTIVE",
                "joinedAt": "2025-01-01T10:00:00Z"
            }
        ],
        "pagination": {
            "page": 1,
            "limit": 10,
            "total": 1
        }
    }
}
```

## Rename Workspace
> PATCH /api/v1/workspace/:tenantId

**Request**
```json
{
    "name": "Acme Corp"
}
```

**Response**
```json
{
    "data": {
        "id": "uuid",
        "name": "Acme Corp",
        "updatedAt": "2025-01-01T10:00:00Z"
    }
}
```

## Remove User from Workspace
> POST /api/v1/workspace/:tenantId/user/:userId/remove

**Response**
```json
{
    "data": {
        "userId": "uuid",
        "tenantId": "uuid",
        "state": "REMOVED"
    }
}
```

## Change User Role
> POST /api/v1/workspace/:tenantId/user/:userId/role

**Request**
```json
{
    "role": "EDITOR"
}
```

**Response**
```json
{
    "data": {
        "userId": "uuid",
        "tenantId": "uuid",
        "role": "EDITOR",
        "updatedAt": "2025-01-01T10:00:00Z"
    }
}
```

## Invite User
> POST /api/v1/workspace/invite

**Request**
```json
{
    "email": "newuser@example.com",
    "tenantId": "uuid",
    "role": "MEMBER"
}
```

**Response**
```json
{
    "data": {
        "id": "uuid",
        "email": "newuser@example.com",
        "tenantId": "uuid",
        "role": "MEMBER",
        "status": "PENDING",
        "expiresAt": "2025-01-08T10:00:00Z"
    }
}
```

## List Invitations by Tenant
> GET /api/v1/workspace/:tenantId/invitations?page=1&limit=10

**Query Parameters**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response**
```json
{
    "data": {
        "invitations": [
            {
                "id": "uuid",
                "email": "invitee@example.com",
                "createdBy": "Alap Parate",
                "createdByMail": "parateforu@gmail.com"
            }
        ],
        "pagination": {
            "page": 1,
            "limit": 10,
            "total": 1
        }
    }
}
```

## Accept Invitation
> POST /api/v1/workspace/invite/accept/:token

**Response**
```json
{
    "data": {
        "id": "uuid",
        "tenantId": "uuid",
        "userId": "uuid",
        "status": "ACCEPTED",
        "acceptedAt": "2025-01-01T10:00:00Z"
    }
}
```

## Revoke Invitation
> POST /api/v1/workspace/invite/revoke/:id

**Response**
```json
{
    "data": {
        "id": "uuid",
        "status": "REVOKED",
        "revokedAt": "2025-01-01T10:00:00Z"
    }
}
```

# 3. Folder & Virtual Hierarchy 

## Create Folder
> POST /api/v1/folders

**Request**
```json
{
    "name": "Invoices",
    "parentId": "uuid | null",
    "tenantId": "uuid"
}
```

**Response**
```json
{
    "data": {
        "id": "folderId",
        "path": "/Finance/Invoices"
    }
}
```

## List Folders (Tree Friendly)
> GET /api/v1/folders?parentId=<uuid|null>&tenantId=<uuid>

**Response**
```json
{
    "data": [
        {
            "id": "uuid",
            "name": "Invoices",
            "hasChildren": true,
            "children": [
                {
                    "id": "uuid",
                    "name": "Jan-2025"
                }
            ]
        }
    ]
}
```

## Get Folder Details
> GET /api/v1/folders/:folderId?tenantId=<uuid>

**Response**
```json
{
    "data": {
        "id": "uuid",
        "name": "Invoices",
        "parentId": "uuid",
        "path": "/Finances/Invoices",
        "depth": 2,
        "stats": {
            "folderCount": 3,
            "fileCount": 34
        },
        "createdAt": "ISO",
        "updatedAt": "ISO"
    }
}
```

## Rename Folder
> PATCH /api/v1/folders/:folderId?tenantId=<uuid>

**Request**
```json
{
    "name": "Invoices-25"
}
```

**Response**
```json
{
    "data": {
        "id": "uuid",
        "name": "Invoices 2025",
        "path": "/Finance/Invoices 2025",
        "updatedAt": "ISO"
    }
}
```

## Move Folder(s) to a Destination Folder
> POST /api/v1/folders/move

**Request**
```json
{
    "folderIds": ["uuid-1", "uuid-2", "uuid-3"],
    "targetParentId": "uuid | null",
    "tenantId": "uuid"
}
```

**Response**
```json
{
    "data": {
        "requested": 3,
        "moved": 2,
        "failed": 1,
        "results": [
            {
                "folderId": "uuid-1",
                "state": "MOVED",
                "parentId": "target-uuid",
                "depth": 3
            },
            {
                "folderId": "uuid-2",
                "state": "MOVED",
                "parentId": "target-uuid",
                "depth": 3
            },
            {
                "folderId": "uuid-3",
                "state": "FAILED",
                "error": {
                    "code": "FOLDER_CYCLE_DETECTED"
                }
            }
        ]
    }
}
```

## Delete Folder(s) (soft delete) - basically moves to recycle bin
> POST /api/v1/folders/delete

**Request**
```json
{
    "folderIds": ["uuid-1", "uuid-2", "uuid-3"],
    "tenantId": "uuid"
}
```

**Response**
```json
{
    "data": {
        "requested": 3,
        "succeeded": 2,
        "failed": 1,
        "results": [
            {
                "id": "uuid-1",
                "state": "RECYCLED"
            },
            {
                "id": "uuid-2",
                "state": "RECYCLED"
            },
            {
                "id": "uuid-3",
                "state": "FAILED",
                "error": {
                    "code": "FILE_NOT_FOUND"
                }
            }
        ]
    }
}
```

## Recycle Bin
## List recycled items
> GET /api/v1/recycle-bin?tenantId=<uuid>&page=1&limit=10

**Response**
```json
{
    "data": [
        {
            "id": "uuid",
            "type": "FOLDER",
            "name": "Invoices",
            "originalParentId": "uuid",
            "recycledAt": "ISO"
        },
        {
            "id": "uuid",
            "type": "FILE",
            "name": "statement.pdf",
            "originalFolderId": "uuid",
            "recycledAt": "ISO"
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 10,
        "total": 2
    }
}
```

## Restore Items
> POST /api/v1/recycle-bin/restore

**Request**
```json
{
    "ids": ["uuid-1", "uuid-2", "uuid-3"],
    "tenantId": "uuid"
}
```

**Response**
```json
{
    "data": {
        "requested": 3,
        "restored": 2,
        "failed": 1,
        "results": [
            {
                "id": "uuid-1",
                "type": "FILE",
                "state": "ACTIVE",
                "parentId": "uuid"
            },
            {
                "id": "uuid-2",
                "type": "FOLDER",
                "state": "ACTIVE",
                "parentId": null
            },
            {
                "id": "uuid-3",
                "type": "FOLDER",
                "state": "FAILED",
                "error": {
                    "code": "RESTORE_CONFLICT"
                }
            }
        ]
    }
}
```

## Permanent Delete
> DELETE /api/v1/recycle-bin/permanent

**Request**
```json
{
    "ids": ["uuid-1", "uuid-2", "uuid-3"],
    "tenantId": "uuid"
}
```

**Response**
```json
{
    "data": {
        "id": "uuid",
        "state": "PURGED",
        "purgedAt": "2025-01-04T10:15:02Z"
    },
    "results": [
        {
            "id": "uuid-1",
            "state": "PURGED",
            "purgedAt": "2025-01-04T10:15:02Z"
        }
    ]
}
```

# 4. File Management

## File Upload (Request a presigned url and upload to it)
> POST /api/v1/files/upload-request

**Request**
```json
{
    "fileName": "statement.pdf",
    "mimeType": "application/pdf",
    "size": 4829384,
    "folderId": "uuid",
    "tenantId": "uuid"
}
```

**Response**
```json
{
    "data": {
        "fileId": "uuid",
        "uploadUrl": "presigned-s3-url",
        "uploadHeaders": {
            "Content-Type": "application/pdf"
        }
    }
}
```

## Confirm Upload
> POST /api/v1/files/:fileId/confirm-upload

**Request**
```json
{
    "tenantId": "uuid"
}
```

**Response**
```json
{
    "data": {
        "fileId": "uuid",
        "confirmed": true
    }
}
```

## List Files
> GET /api/v1/files?folderId=<uuid>&tenantId=<uuid>

**Response**
```json
{
    "data": [
        {
            "id": "fileId",
            "name": "statement.pdf",
            "status": "UPLOADED | PROCESSING | READY | FAILED",
            "pages": 12,
            "createdAt": "ISO"
        }
    ]
}
```

## Get File Details
> GET /api/v1/files/:fileId?tenantId=<uuid>

**Response**
```json
{
    "data": {
        "id": "uuid",
        "name": "policy.pdf",
        "type": "PDF",
        "mimeType": "application/pdf",
        "size": 4829384,
        "state": "READY",
        "processing": {
            "status": "READY",
            "pages": 12,
            "processedAt": "2025-01-04T09:32:10Z",
            "failedReason": null
        },
        "folder": {
            "id": "uuid",
            "path": "/Finance/Policies"
        },
        "preview": {
            "available": true,
            "pageCount": 12
        },
        "createdAt": "2025-01-04T09:12:44Z",
        "updatedAt": "2025-01-04T09:32:10Z"
    }
}
```

## Get File Download URL
> GET /api/v1/files/:fileId/download?tenantId=<uuid>

**Response**
```json
{
    "data": {
        "url": "presigned-s3-url",
        "expiresIn": 3600
    }
}
```

## Move Files
> POST /api/v1/files/move

**Request**
```json
{
    "ids": ["uuid-1", "uuid-2", "uuid-3"],
    "targetParentId": "uuid | null",
    "tenantId": "uuid"
}
```

**Response**
```json
{
    "data": {
        "requested": 3,
        "moved": 2,
        "failed": 1,
        "results": [
            {
                "fileId": "uuid-1",
                "state": "MOVED",
                "parentId": "target-uuid",
                "depth": 3
            },
            {
                "fileId": "uuid-2",
                "state": "MOVED",
                "parentId": "target-uuid",
                "depth": 3
            },
            {
                "fileId": "uuid-3",
                "state": "FAILED",
                "error": {
                    "code": "FILE_NOT_FOUND"
                }
            }
        ]
    }
}
```

## Delete File(s) (soft delete) - basically moves to recycle bin
> POST /api/v1/files/delete

**Request**
```json
{
    "fileIds": ["uuid-1", "uuid-2", "uuid-3"],
    "tenantId": "uuid"
}
```

**Response**
```json
{
    "data": {
        "requested": 3,
        "deleted": 2,
        "failed": 1,
        "results": [
            {
                "fileId": "uuid-1",
                "status": "RECYCLED"
            },
            {
                "fileId": "uuid-2",
                "status": "RECYCLED"
            },
            {
                "fileId": "uuid-3",
                "status": "FAILED",
                "error": {
                    "code": "FILE_NOT_FOUND"
                }
            }
        ]
    }
}
```

# 5. Processing Pipeline

## Get Processing Progress
> GET /api/v1/processing/progress/:fileId

**Response**
```json
{
    "processedPages": 5,
    "totalPages": 10,
    "percent": 50,
    "status": "active | completed | failed",
    "stage": "EMBEDDING_GENERATION",
    "stageTimings": {
        "pdfSplittingMs": 1200,
        "savingPagesMs": 800,
        "chunkingMs": 500,
        "embeddingMs": 3500,
        "indexingMs": 1200
    }
}
```

**Status Values:**
- `"active"`: Job is currently running
- `"completed"`: Job finished successfully
- `"failed"`: Job encountered an error

**Stage Values:**
- `"PDF_SPLITTING"`: Extracting pages from PDF
- `"SAVING_PAGES"`: Saving page images to storage
- `"CHUNKING"`: Splitting pages into text chunks
- `"EMBEDDING_GENERATION"`: Generating vector embeddings
- `"INDEXING"`: Indexing chunks in Elasticsearch
- `"COMPLETED"`: All stages finished

## Get Processing History
> GET /api/v1/processing/history/:fileId

**Response**
```json
[
        {
            "id": "uuid",
            "fileId": "uuid",
            "type": "INDEX",
            "status": "COMPLETED",
            "jobId": "uuid",
            "error": null,
            "stage": "COMPLETED",
            "stageTimings": {
                "pdfSplittingMs": 1200,
                "savingPagesMs": 800,
                "chunkingMs": 500,
                "embeddingMs": 3500,
                "indexingMs": 1200
            },
            "stageHistory": [
                {
                    "stage": "PDF_SPLITTING",
                    "startedAt": "2025-01-01T10:00:00Z",
                    "endedAt": "2025-01-01T10:00:02Z",
                    "durationMs": 1200
                },
                {
                    "stage": "SAVING_PAGES",
                    "startedAt": "2025-01-01T10:00:02Z",
                    "endedAt": "2025-01-01T10:00:03Z",
                    "durationMs": 800
                },
                {
                    "stage": "CHUNKING",
                    "startedAt": "2025-01-01T10:00:03Z",
                    "endedAt": "2025-01-01T10:00:04Z",
                    "durationMs": 500
                },
                {
                    "stage": "EMBEDDING_GENERATION",
                    "startedAt": "2025-01-01T10:00:04Z",
                    "endedAt": "2025-01-01T10:00:07Z",
                    "durationMs": 3500
                },
                {
                    "stage": "INDEXING",
                    "startedAt": "2025-01-01T10:00:07Z",
                    "endedAt": "2025-01-01T10:00:08Z",
                    "durationMs": 1200
                }
            ],
            "createdAt": "2025-01-01T10:00:00Z",
            "updatedAt": "2025-01-01T10:00:08Z"
        }
]
```

# 6. Search

## Search Documents (Keyword Search)
> GET /api/v1/search?q=<query>&folderId=<uuid>&tenantId=<uuid>&limit=20&offset=0

**Query Parameters:**
- `q` (required): Search query string
- `folderId` (optional): Filter results to a specific folder
- `tenantId` (optional): Override tenant context (defaults to user's tenant)
- `limit` (optional): Maximum number of results (default: 20, max: 100)
- `offset` (optional): Number of results to skip (default: 0)

**Response**
```json
{
    "matches": [
        {
            "fileId": "uuid",
            "fileName": "policy.pdf",
            "pageNumber": 3,
            "snippet": "…interest rate hike will impact…",
            "score": 0.87
        }
    ],
    "total": 1,
    "query": "interest rate hike"
}
```

**Note:** This endpoint uses **KEYWORD** mode for query history logging.

# 7. RAG (Retrieval-Augmented Generation)

## Ask Question (RAG Search - Streaming)
> POST /api/v1/rag/ask

**Description**: Returns a Server-Sent Events (SSE) stream with the LLM-generated answer. The answer tokens are streamed as they're generated, providing faster perceived response times.

**Request**
```json
{
    "question": "What is the interest rate policy?",
    "tenantId": "uuid",
    "folderId": "uuid",
    "topK": 5,
    "useHybridSearch": true
}
```

**Response Headers**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

**Response Format (Server-Sent Events)**

The response is a stream of SSE events:

1. **Sources Event** (sent first):
```
event: sources
data: {"sources":[{"fileId":"uuid","fileName":"policy.pdf","pageNumber":3,"chunkIndex":0,"snippet":"The interest rate policy...","score":0.92}]}

```

2. **Token Events** (streamed as LLM generates tokens):
```
event: token
data: {"token":"Based"}

event: token
data: {"token":" on"}

event: token
data: {"token":" the"}

event: token
data: {"token":" documents"}

...
```

3. **Done Event** (sent when streaming completes):
```
event: done
data: {"metadata":{"model":"llama3.2","usage":{"promptTokens":150,"completionTokens":80,"totalTokens":230}}}
```

4. **Error Event** (if an error occurs):
```
event: error
data: {"error":"Error message here"}
```

**Example Client Usage (JavaScript)**

Note: The native `EventSource` API only supports GET requests. For POST requests with SSE, use `fetch` with streaming:

```javascript
async function streamRAGAnswer(question, tenantId, topK = 5, useHybridSearch = true) {
    const response = await fetch('/api/v1/rag/ask', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            question,
            tenantId,
            topK,
            useHybridSearch
        })
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let sources = [];
    let answer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
            if (line.startsWith('event: ')) {
                const eventType = line.slice(7).trim();
                const dataLine = lines[lines.indexOf(line) + 1];
                if (dataLine && dataLine.startsWith('data: ')) {
                    const data = JSON.parse(dataLine.slice(6));
                    
                    if (eventType === 'sources') {
                        sources = data.sources;
                        console.log('Sources:', sources);
                    } else if (eventType === 'token') {
                        answer += data.token;
                        // Update UI with streaming answer
                        updateAnswerUI(answer);
                    } else if (eventType === 'done') {
                        console.log('Model:', data.metadata.model);
                        console.log('Usage:', data.metadata.usage);
                        return { sources, answer, metadata: data.metadata };
                    } else if (eventType === 'error') {
                        throw new Error(data.error);
                    }
                }
            }
        }
    }

    return { sources, answer };
}
```

Alternatively, using a library like `eventsource-parser` or `@microsoft/fetch-event-source`:

```javascript
import { fetchEventSource } from '@microsoft/fetch-event-source';

await fetchEventSource('/api/v1/rag/ask', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
        question: "What is the interest rate policy?",
        tenantId: "uuid",
        topK: 5,
        useHybridSearch: true
    }),
    onmessage(ev) {
        const data = JSON.parse(ev.data);
        if (ev.event === 'sources') {
            sources = data.sources;
        } else if (ev.event === 'token') {
            answer += data.token;
            updateAnswerUI(answer);
        } else if (ev.event === 'done') {
            console.log('Complete:', data.metadata);
        } else if (ev.event === 'error') {
            console.error('Error:', data.error);
        }
    }
});
```

**Query Modes:**
- `useHybridSearch: true` → Uses **HYBRID** mode (keyword + semantic/vector search)
- `useHybridSearch: false` → Uses **RAG** mode (keyword-only retrieval within RAG pipeline)
- `/search` endpoint → Uses **KEYWORD** mode (pure keyword search)

# 8. Query History

## List Query History
> GET /api/v1/query-history?page=1&limit=10

**Response**
```json
{
    "data": [
        {
            "id": "uuid",
            "tenantId": "uuid",
            "userId": "uuid",
            "query": "What is the interest rate policy?",
            "queryMode": "HYBRID | KEYWORD | RAG",
            "confidence": "High | Medium | Low",
            "totalChunksRetrieved": 5,
            "rerankScore": 0.89,
            "totalTimeMs": 1250,
            "documentsUsed": [
                {
                    "fileId": "uuid",
                    "fileName": "policy.pdf",
                    "pageNumber": 3,
                    "chunkIndex": 0,
                    "score": 0.92
                }
            ],
            "citations": null,
            "createdAt": "2025-01-01T10:00:00Z"
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 10,
        "total": 25
    }
}
```

# 9. Health

## Health Check
> GET /health

**Response**
```json
{
    "status": "ok"
}
```
