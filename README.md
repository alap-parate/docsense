<p align="center">
  <img align="center" src="https://github.com/alap-parate/docsense/blob/main/docs/logo.png" width="500" alt="accessibility text">
</p>
<h1 align="center" >
  Docsense
</h1>

DocSense is a document intelligence platform that allows users to upload PDFs
and perform page-level full-text search with immediate context rendering.

Instead of returning vague document matches, DocSense resolves queries directly
to the exact pages where text appears and opens them instantly.

## Why DocSense

- PDFs are hard to search
- Document-level search hides context
- Users want answers, not filenames

DocSense treats search as navigation, not discovery.

## Core Features

- PDF upload with asynchronous processing
- Page-level full-text search
- Immediate page rendering with highlights
- Tagging and tag-based filtering
- Progress visibility during processing
- Graceful handling of unprocessable PDFs

## High-Level Design (Brief)

DocSense separates responsibilities clearly:

- API handles requests and orchestration
- Workers handle all heavy processing
- Relational database stores authoritative metadata
- Search engine stores rebuildable page-level indexes

## Status

Active development.

