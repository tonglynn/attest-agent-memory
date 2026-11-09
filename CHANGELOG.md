# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] — 2026-11-10

First public release.

### Added

- Write path: notes are learned only from verified changes; each candidate quotes the review
  comment and the changed line it applied; a deterministic evidence gateway decides
  approve, reject or hold for a person.
- Recall path: repository and version-range scoping, lexical ranking with optional hybrid
  (BM25 + embedding) retrieval, soft token budget with core rules first, provenance on every
  injected note, outcome feedback (verified, suspect, retired).
- Human governance: `attest-admin` to review, approve, reject and retract; supersession for
  policy changes; append-only, HMAC-sealed event log with tamper detection.
- MCP server (`attest-mcp`) exposing `recall`, `learn`, `report_outcome` and `list_notes`.
- Benchmark of 25 tasks on a synthetic billing codebase, the preregistered experiment and
  exploratory experiments, with every run committed under `runs/`.
- Interactive demo running the real code in the browser via Pyodide.

[0.1.0]: https://github.com/tonglynn/attest-agent-memory/releases/tag/v0.1.0
