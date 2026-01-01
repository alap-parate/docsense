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
- No file bytes are going through DB - only through MinIO

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

## Login
> POST /auth/login

**Request**

```json
{
    "email": "someone@gmail.com",
    "password": "secret"
}
```

**Response**
```json
{
    "data": {
        "accessToken": "jwt",
        "refreshToken": "jwt"
    }
}
```

## Logout
> POST /auth/logout

**Response**
```json
{
    "data": {
        "loggedOut": true
    },
}
```

## Register
> POST /auth/register

**Request**
```json
{
    "email": "user@acme.com",
    "password": "StrongPassword123",
    "name": "John Doe",
    "tenantName": "Acme Inc"
}
```
**Response**
```json
{
    "data": {
        "userId": "uuid",
        "tenantId": "uuid"
    },
}
```

## Refresh Token
> POST /auth/refresh

**Request**
```json
{
    "refreshToken": "opaque-token"
}
```
**Response**
```json
{
    "data": {
        "accessToken": "new-jwt",
        "refreshToken": "new-opaque-token"
    }
}
```
## List active Sessions
> GET /auth/sessions

**Response**
```json
{
    "data": [
        {
            "sessionId": "uuid",
            "createdAt": "2025-01-01T10:00:00Z",
            "lastUsedAt": "2025-01-01T10:00:00Z",
            "device": {
                "name": "Chrome on Linux",
                "os": "Ubuntu",
                "browser": "Chrome"
            },
            "ip": "10.2.4.112",
            "current": true
        }, ...
    ],
    "meta": {},
    "error": {}
}
```

## Revoke a specific Session
> DELETE /auth/sessions/:sessionId

**Response**
```json
{
    "data": {
        "sessionId": "uuid",
        "state": "REVOKED",
        "revokedAt": "2025-01-01T00:00:05Z"
    }
}
```

## Revoke All Sessions
> DELETE /auth/sessions

**Response**
```json
{
    "data": {
        "revokedCount": 4
    }
}
```

## Get Logged in User
> GET /auth/me

**Response**
```json
{
    "data": {
        "id": "uuid",
        "email": "user@acme.com",
        "name": "John Doe",
        "tenantId": "uuid",
    }
}
```

## Edit Logged in User
> PATCH /auth/me

**Request**
```json
{
    "name": "Jim Carry"
}
```

**Response**
```json
{
    "data": {
        "id": "uuid",
        "email": "user@acme.com",
        "name": "Jim Carry",
    }
}
```

## Change Password
> POST /auth/change-password

**Request**
```json
{
    "currentPassword": "OldPass123!",
    "newPassword": "NewStrongPass455"
}
```
**Response**
```json
{
    "data": {
        "passwordChanged": true
    }
}
```

## Forgot Password
> POST /auth/forgot-password

**Request**
```json
{
  "email": "user@acme.com"
}

```
**Response**
```json
{
    "data": {
        "emailSent": true
    }
}
```

## Reset Password
> POST /auth/reset-password

**Request**
```json
{
  "resetToken": "one-time-token",
  "newPassword": "BrandNewPass789!"
}
```
**Response**
```json
{
    "data": {
        "passwordReset": true
    }
}
```

## Rotate Email
> POST /auth/change-email

**Request**
```json
{
  "newEmail": "mark@inc.com",
  "password": "ExistingPass678!"
}
```
**Response**
```json
{
    "data": {
        "verificationSent": true
    }
}
```

## Verify Mail Rotation
> POST /auth/verify-email-change

**Request**
```json
{
  "token": "abc123",
}
```
**Response**
```json
{
    "data": {
        "emailUpdated": true,
        "email": "new.email@example.com"
    }
}
```

# 2. Folder & Virtual Hierarchy 

## Create Folder
> POST /folders

**Request**
```json
{
    "name": "Invoices",
    "parentId": "uuid | null"
}
```
**Request**
```json
{
    "data": {
        "id": "folderId",
        "path": "/Finance/Invoices"
    }
}
```

## List Folders (Tree Friendly)
> GET /folders?parentId=<uuid|null>

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
                }, ...
            ]
        }
    ]
}
```

## Get Folder Details
> GET /folders/:folderId

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
> PATCH /folders/:folderId

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
  },
}
```

## Move Folder(s) to a Destination Folder
> POST /folders/move

**Request**
```json
{
    "folderIds": ["uuid-1", "uuid-2", "uuid-3"],
    "targetParentId": "uuid | null" 
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
                    "code": "FOLDER_CYCLE_DETECTED",
                }
            }
        ]
    }
}
```

## Delete Folder(s) (soft delete) - basically moves to recycle bin
> POST /folders/delete

**Request**
```json
{
  "folderIds": ["uuid-1", "uuid-2", "uuid-3"],
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
> GET /recycle-bin

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
  "meta": {},
  "error": null
}
```

## Restore Folder
> POST /recycle-bin/restore

**Request**
```json
{
  "ids": [
    "uuid-1",
    "uuid-2",
    "uuid-3"
  ]
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
  },
  "meta": {},
  "error": null
}
```

## Permanent Delete
> DELETE /recycle-bin/permanent

**Request**
```json
{
  "ids": [
    "uuid-1",
    "uuid-2",
    "uuid-3"
  ]
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
  "meta": {},
  "error": null
}
```

# 3. File Management

## File Upload (Request a presigned url and upload to it)
> POST /files/upload-request

**Request**
```json
{
  "fileName": "statement.pdf",
  "mimeType": "application/pdf",
  "size": 4829384,
  "folderId": "uuid"
}
```
**Response**
```json
{
  "data": {
    "fileId": "uuid",
    "uploadUrl": "presigned-minio-url"
  }
}
```

## List Files
> GET /files?folderId=<uuid>

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

## Move Files
> POST /files/move

**Request**
```json
{
    "ids": ["uuid-1", "uuid-2", "uuid-3"],
    "targetParentId": "uuid | null"
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
  },
  "meta": {},
  "error": null
}

```

## File Detail
> GET /files/:fileId

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
  },
  "meta": {},
  "error": null
}

```

## Delete File(s) (soft delete) - basically moves to recycle bin
> POST /files/delete

**Request**
```json
{
  "fileIds": [
    "uuid-1",
    "uuid-2",
    "uuid-3"
  ],
  "mode": "RECYCLE"
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
  },
  "meta": {},
  "error": null
}
```

# 4. Processing Pipeline

## Trigger Processing
> POST /files/:fileId/process

**Response**
```json
{
  "data": {
    "jobId": "uuid",
    "status": "QUEUED"
  }
}
```

## Job Status
> GET /jobs/:jobId

**Response**
```json
{
  "data": {
    "status": "RUNNING | COMPLETED | FAILED",
    "progress": 0.65
  }
}
```

# 5. Search

## Search Documents
> POST /search

**Request**
```json
{
  "query": "interest rate hike",
  "folderId": "uuid | null",
  "filters": {
    "mimeType": ["application/pdf"],
    "dateFrom": "2024-01-01"
  },
  "limit": 10,
  "offset": 0
}
```
**Response**
```json
{
  "data": [
    {
      "fileId": "uuid",
      "fileName": "policy.pdf",
      "score": 0.87,
      "matches": [
        {
          "page": 3,
          "snippet": "…interest rate hike will impact…"
        }
      ]
    }
  ]
}
```