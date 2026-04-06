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
