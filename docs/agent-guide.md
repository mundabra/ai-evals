# Agent Guide

## Architecture

The package is split into two layers:

1. **Root deterministic core**
   - source registry and citation verification
   - grounding metadata and summaries
   - deterministic benchmark scoring
   - run artifacts, local exporters, and aggregation helpers
2. **Optional `./ai-sdk` review layer**
   - structured draft review using AI SDK `generateText`
   - caller-supplied model
   - retry and failure shaping

The root export must stay free of product runtimes and app frameworks.

## Core Data Flow

### Grounding

1. Register prompt docs, tool docs, or URLs in `SourceRegistry`.
2. Verify emitted citations against the registry.
3. Build `GroundingMetadata`.
4. Reduce metadata into `GroundingSummary` when compact reporting is enough.

### Deterministic scoring

1. Define an `EvalCase` with expected facts, forbidden claims, and optional checks.
2. Pass the produced output text and any optional runtime signals into `scoreDeterministicCase`.
3. Use the returned `DeterministicScoreResult` in reports or CI.

### Run artifacts

1. Build item-level results directly or produce them through `runSuite`.
2. Convert them into a standard `EvalRun` with `buildRunArtifact`.
3. Export or persist the run with `exportLocalJson`, `exportLocalCsv`, or `writeRunArtifacts`.

### AI review

1. Import from `@mundabra/ai-evals/ai-sdk`.
2. Supply the model explicitly.
3. Call `reviewDraft` or bind a reviewer with `createDraftReviewer`.

## Invariants

- Fallback citation matching only succeeds when label and source map to exactly one registry entry.
- Unknown grounding statuses are ignored during aggregation.
- `pending` grounding is rolled into `unverified` in distribution helpers.
- Deterministic scoring skips output-type, approval, or grounding checks when the eval case does not require them.
- Derived numeric metric summaries use mean, min, max, standard deviation, and standard error across all items that emit a given metric.
- AI review retries only `NoOutputGeneratedError` by default.
- Programming errors in the AI review path must still throw.

## Non-Goals

- scheduling or orchestrating benchmarks beyond an in-process suite runner
- storing results
- defining business-specific rubric semantics
- replacing human review in sensitive workflows
