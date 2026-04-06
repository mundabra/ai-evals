# Eval Reference

## Root Export

### Source and grounding

- `SourceRegistry`
- `verifyCitations(citations, registry)`
- `buildGroundingMetadata(input)`
- `summarizeGrounding(metadata)`
- `sourcePrecision(summary)`
- `sourceCoverage(summary)`

### Fixture helpers

- `scoreFixture(fixture)`
- `aggregateFixtureResults(results)`

### Deterministic scoring

- `scoreDeterministicCase(input)`

Input highlights:

- `evalCase.expected.outputType`: optional
- `evalCase.expected.shouldRequireApproval`: optional
- `evalCase.expected.requireGrounding`: optional
- `evalCase.expected.requiredFacts`: optional
- `evalCase.expected.forbiddenClaims`: optional
- `evalCase.expected.rubric`: optional

### Aggregation

- `buildGroundingDistribution(records)`
- `buildReviewDistribution(records, options?)`
- `defaultReviewDimensions`

### Run artifacts and export

- `buildRunArtifact(input)`
- `exportLocalJson(run)`
- `exportLocalCsv(run, options?)`
- `writeRunArtifacts(run, options)`
- `runSuite(input)`

Run artifact fields:

- `runId`
- `generatedAt`
- `suiteName`
- `evaluatorName` optional
- `items`
- `config`
- `summary`
- `report`

Artifact files written by `writeRunArtifacts`:

- `results.json`
- `report.json`
- `run_config.json` with `runId`, `generatedAt`, package metadata, and suite config
- `items.jsonl`
- optional `items.csv`

CSV option fields:

- `metrics`: derived metric names such as `review.score.accuracy`, `metric.tokens_used`, or `runtime.durationMs`

## `./ai-sdk` Export

- `reviewDraft(request, options)`
- `createDraftReviewer(options)`
- `defaultReviewDimensions`

Request fields:

- `userRequest`
- `draftOutput`
- `retrievedFacts` optional
- `reviewFocus` optional

Options fields:

- `model`
- `generate` optional override
- `maxAttempts`
- `dimensions`
- `maxRetrievedFactsChars`
- `maxDraftChars`
- `maxOutputTokens`

Result shape:

- `status: "completed"` with `summary`, `verdict`, `scores`, optional `strengths`, `issues`, `revisedDraft`
- `status: "failed"` with `summary` and `failureReason`
