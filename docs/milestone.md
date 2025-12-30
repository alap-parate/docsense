# Project Build Order

1. Database Schema
2. API Contracts
3. API Skeleton
4. Worker Skeleton
5. Frontend Skeleton (with mock data)
6. End-to-end integration
7. Refinement


### Why this order ?
Think in layers of irreversibility
- DB Schema -> hardest to change
- API Contracts -> expensive to change
- UI -> easy to change
- internals -> easiest to change