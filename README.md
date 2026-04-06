# @mundabra/ai-evals

Lightweight TypeScript evals for grounded AI workflows. No SaaS. No hosted dashboard. No mandatory tracing backend. Just small, local primitives for citation verification, deterministic scoring, report aggregation, and optional AI SDK-backed draft review.

## Status

`@mundabra/ai-evals` is currently in **beta**.

It is usable today for local evals and internal quality gates, but the first releases are still evolving in three areas:

- public API ergonomics
- custom-dimension and schema flexibility
- packaging patterns for mixed deterministic and model-backed evals

## Why Evals Matter

Most teams know they need evals, but many do not want a full hosted eval platform just to answer a few recurring product questions:

- did the model keep the required facts?
- did it invent a claim we explicitly forbid?
- are the citations actually grounded in available sources?
- did the draft need approval or human review?
- when a reviewer says “revise,” what exactly was weak?

Those questions come up constantly in real product workflows:

- a grounded answer includes a citation that was never in the prompt or tool outputs
- a customer-facing draft quietly drops one critical fact from the source set
- an internal summary states a launch is approved when approval is still pending
- a generated draft sounds plausible, but a reviewer can point to accuracy or actionability gaps

This package is meant to be the small application-side eval layer between your product and the model:

- verify citations against a known source registry
- score deterministic expectations like fact coverage and forbidden claims
- aggregate compact quality signals for CI or reporting
- run structured “review this draft” passes with the AI SDK when deterministic checks are not enough

The goal is practical, inspectable eval building blocks for TypeScript apps, not a promise of truth or a substitute for human judgment.

## Features

- **Source registry and citation verification** for prompt docs, tool docs, and URLs
- **Grounding metadata and summaries** for compact downstream reporting
- **Deterministic eval scoring** for required facts, forbidden claims, output type checks, approval checks, and grounding checks
- **Paraphrase-tolerant fact matching** using exact-match and token-coverage rules
- **Review score aggregation** with default or custom dimensions
- **Structured AI draft review** behind the optional `./ai-sdk` export
- **Small OSS surface** with dist-only publishing, ESM output, and no framework dependency in the root package

## Install

Core package:

```bash
npm install @mundabra/ai-evals
# or
pnpm add @mundabra/ai-evals
```

If you want the AI SDK review helpers as well:

```bash
pnpm add @mundabra/ai-evals ai @ai-sdk/provider
```

Then install whichever provider package you plan to use, for example `@ai-sdk/openai` or `@ai-sdk/anthropic`.

## AI Agent Entry Points

For coding agents and documentation crawlers:

- `LICENSE` — repository license
- `DISCLAIMER.md` — usage and risk disclaimer
- `AGENTS.md` — shared repo instructions for coding agents
- `CLAUDE.md` — minimal Claude entrypoint
- `CONTRIBUTING.md` — contributor workflow and verification steps
- `SECURITY.md` — disclosure path and security scope
- `llms.txt` — lightweight machine-readable index
- `llms-full.txt` — single-file expanded context
- `docs/agent-guide.md` — architecture and invariants
- `docs/eval-reference.md` — concise API catalog

## Development

```bash
pnpm install
pnpm check
```

`pnpm check` runs tests, typecheck, build, and a pack smoke test that imports the built tarball.

## License And Disclaimer

This project is licensed under the MIT license. See [LICENSE](./LICENSE).

This package is provided as a practical evals layer, not as a complete assessment or governance system. Read [DISCLAIMER.md](./DISCLAIMER.md) and [SECURITY.md](./SECURITY.md) before using it in production or high-risk workflows.

## Quick Start

### Deterministic Scoring

```ts
import { scoreDeterministicCase } from '@mundabra/ai-evals';

const result = scoreDeterministicCase({
  evalCase: {
    id: 'renewal-follow-up',
    expected: {
      outputType: 'follow_up_email',
      shouldRequireApproval: true,
      requireGrounding: true,
      requiredFacts: [
        { label: 'security review is complete' },
        { label: 'pricing review happens next Tuesday' },
      ],
      forbiddenClaims: [
        { label: 'contract is already signed' },
      ],
      rubric: ['fact_faithfulness', 'tone_fit'],
    },
  },
  outputType: 'follow_up_email',
  requiredApproval: 'draft_review',
  grounding: {
    verificationScope: 'source',
    status: 'verified',
    candidateCount: 2,
    attachedCount: 2,
    removedCount: 0,
    sourceCount: 2,
  },
  outputText:
    'Security review is complete, and pricing review happens next Tuesday before we send the customer follow-up.',
});

console.log(result.deterministic.deterministicPass);
// true
```

### Grounding Verification

```ts
import {
  SourceRegistry,
  buildGroundingMetadata,
  summarizeGrounding,
  verifyCitations,
} from '@mundabra/ai-evals';

const registry = new SourceRegistry();
registry.addPromptDocuments([
  { id: 'doc_1', title: 'Account Brief', source: 'drive' },
]);

const candidateCitations = [
  { id: 'doc_1', label: 'drive: Account Brief', source: 'drive' },
];

const verification = verifyCitations(candidateCitations, registry);
const metadata = buildGroundingMetadata({
  candidateCitations,
  emittedCitations: verification.verifiedCitations,
  registry,
  removedCitations: verification.removedCitations,
});

const summary = summarizeGrounding(metadata);
console.log(summary?.status);
// "verified"
```

### AI SDK Draft Review

```ts
import { reviewDraft } from '@mundabra/ai-evals/ai-sdk';
import { openai } from '@ai-sdk/openai';

const result = await reviewDraft(
  {
    userRequest: 'Draft a follow-up email after the pricing review call.',
    retrievedFacts: 'Security review is complete. Pricing review happens next Tuesday.',
    draftOutput: 'Hi team, following up after pricing review...',
    reviewFocus: 'Customer-ready tone and grounded accuracy',
  },
  {
    model: openai('gpt-4o-mini'),
  },
);

if (result.status === 'completed') {
  console.log(result.verdict);
  console.log(result.scores.accuracy);
}
```

## What It Measures In Practice

These are representative examples from the kind of product workflows this package was built for: grounded answers, internal summaries, approval-aware drafts, and reviewable outbound content.

### Fabricated Citation In A Grounded Answer

Workflow: the assistant emits a citation that was never registered from prompt docs or tool outputs.

```ts
const registry = new SourceRegistry();
registry.addPromptDocuments([
  { id: 'doc_1', title: 'Account Brief', source: 'drive' },
]);

const verification = verifyCitations(
  [{ id: 'doc_404', label: 'drive: Missing Brief', source: 'drive' }],
  registry,
);
```

Typical result:

```ts
verification.removedCitations[0].reason;
// "citation not found in source registry"
```

### Missing Required Fact In A Customer Draft

Workflow: a draft includes one expected fact but silently drops another.

```ts
const result = scoreDeterministicCase({
  evalCase: {
    id: 'customer-follow-up',
    expected: {
      requiredFacts: [
        { label: 'security review is complete' },
        { label: 'pricing review happens next Tuesday' },
      ],
    },
  },
  outputText: 'Security review is complete and we can proceed.',
});
```

Typical result:

```ts
result.deterministic.requiredFactsMissing;
// ["pricing review happens next Tuesday"]
```

### Forbidden Claim In An Internal Summary

Workflow: an internal summary states a launch is approved even though that claim is forbidden.

```ts
const result = scoreDeterministicCase({
  evalCase: {
    id: 'launch-summary',
    expected: {
      forbiddenClaims: [{ label: 'launch is fully approved' }],
    },
  },
  outputText: 'The launch is fully approved and ready to send.',
});
```

Typical result:

```ts
result.deterministic.forbiddenClaimsPresent;
// ["launch is fully approved"]
```

### Structured Review For A Near-Final Draft

Workflow: the draft looks plausible, but you want a quality-gate verdict and concrete issues.

Typical completed result:

```ts
{
  status: 'completed',
  verdict: 'revise_minor',
  scores: {
    accuracy: 4,
    completeness: 4,
    clarity: 5,
    tone: 4,
    actionability: 5,
  },
}
```

These are representative examples, not guarantees. Exact behavior depends on the expectations you encode and, for model-backed review, the model you choose.

## Configuration

### Deterministic Eval Cases

```ts
const evalCase = {
  id: 'draft-check',
  expected: {
    outputType: 'follow_up_email',
    shouldRequireApproval: true,
    requireGrounding: true,
    requiredFacts: [
      { label: 'security review is complete' },
      {
        label: 'pricing review happens next Tuesday',
        matchAny: ['pricing review happens next Tuesday', 'pricing review next Tuesday'],
      },
    ],
    forbiddenClaims: [
      { label: 'contract is already signed' },
    ],
    rubric: ['fact_faithfulness', 'approval_correctness'],
  },
} as const;
```

Fields are all optional except `id`. If you omit a check, the scorer skips it instead of forcing a failure.

### Draft Review

```ts
import { createDraftReviewer } from '@mundabra/ai-evals/ai-sdk';
import { anthropic } from '@ai-sdk/anthropic';

const reviewer = createDraftReviewer({
  model: anthropic('claude-haiku-4.5'),
  maxAttempts: 2,
  dimensions: ['grounding', 'concision', 'tone'] as const,
});

const result = await reviewer.reviewDraft({
  userRequest: 'Review this customer-facing draft',
  draftOutput: 'Hi team...',
});
```

Defaults:

- `maxAttempts`: `2`
- `maxOutputTokens`: `1400`
- default dimensions: `accuracy`, `completeness`, `clarity`, `tone`, `actionability`
- retry only on `NoOutputGeneratedError`

## How It Works

### Architecture

```
Root package (deterministic core)
┌────────────────────────────────────┐
│ SourceRegistry                     │
│ verifyCitations                    │
│ buildGroundingMetadata             │
│ summarizeGrounding                 │
│ scoreDeterministicCase             │
│ buildGroundingDistribution         │
│ buildReviewDistribution            │
└────────────────────────────────────┘

Optional ./ai-sdk export
┌────────────────────────────────────┐
│ reviewDraft                        │
│ createDraftReviewer                │
│ caller-supplied model              │
│ structured output schema           │
│ retry + failure shaping            │
└────────────────────────────────────┘
```

The root export stays framework-agnostic. The AI SDK integration lives behind a subpath export so consumers who only need deterministic evals do not need to adopt a model provider.

### Grounding Flow

1. Register prompt docs, tool docs, or URLs in `SourceRegistry`.
2. Verify emitted citations against the registry.
3. Build `GroundingMetadata`.
4. Reduce it to `GroundingSummary` when compact reporting is enough.

### Deterministic Scoring

`scoreDeterministicCase` uses two matching strategies:

- **Exact normalized match** for clear string containment checks
- **Token coverage fallback** for paraphrased required facts

For short candidates of three tokens or fewer, coverage must be exact. For longer candidates, the current threshold is `>= 0.75`.

### AI Review

`reviewDraft` uses AI SDK `generateText` with structured output:

- caller supplies the model
- the prompt includes the original request, facts, draft, and scoring dimensions
- oversized fact and draft sections are truncated before review
- `NoOutputGeneratedError` retries by default
- programming errors still throw

## Public API

Root export:

- `SourceRegistry`
- `verifyCitations`
- `buildGroundingMetadata`
- `summarizeGrounding`
- `sourcePrecision`
- `sourceCoverage`
- `scoreFixture`
- `aggregateFixtureResults`
- `scoreDeterministicCase`
- `buildGroundingDistribution`
- `buildReviewDistribution`
- shared types such as `Citation`, `SourceEntry`, `EvalCase`, `DeterministicScoreResult`, `GroundingMetricRecord`, and `ReviewMetricRecord`

Optional `./ai-sdk` export:

- `reviewDraft`
- `createDraftReviewer`
- `defaultReviewDimensions`
- AI review types such as `ReviewRequest`, `ReviewResult`, `ReviewIssue`, and `ReviewScores`

For the concise reference, see [docs/eval-reference.md](./docs/eval-reference.md).

## Standalone Usage Patterns

### CI or Unit Tests

Use `scoreDeterministicCase` for product-specific fixture tests where the expected facts and forbidden claims are known ahead of time.

### Runtime Quality Signals

Use `SourceRegistry`, `verifyCitations`, and `buildGroundingMetadata` when your product emits citations or references retrieved content.

### Human-In-The-Loop Review

Use `reviewDraft` or `createDraftReviewer` when you want a structured “approve / revise” pass for a near-final draft before it goes to a human reviewer or customer workflow.

## Limitations

This package is useful for measuring conformance and review signals. It is not a guarantee of:

- factual correctness
- safety or compliance coverage
- authorization correctness
- legal review readiness
- product readiness on its own
- benchmark validity if the expectations themselves are weak

Read [DISCLAIMER.md](./DISCLAIMER.md) and [SECURITY.md](./SECURITY.md) before using it in high-risk or externally regulated workflows.
