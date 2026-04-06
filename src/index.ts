export type {
  Citation,
  DeterministicChecks,
  DeterministicScoreResult,
  EvalCase,
  EvalCaseExpected,
  EvalExpectation,
  GroundingFixture,
  GroundingFixtureCategory,
  GroundingFixtureResult,
  GroundingMetadata,
  GroundingMetricRecord,
  GroundingStatus,
  GroundingSummary,
  GroundingVerificationScope,
  RemovedCitation,
  ReviewDimension,
  ReviewMetricRecord,
  ReviewScores,
  ReviewVerdict,
  SourceEntry,
  SourceKind,
} from './types.js';
export { defaultReviewDimensions } from './review-defaults.js';
export { SourceRegistry } from './source-registry.js';
export type { CitationVerificationResult } from './verify-citations.js';
export { verifyCitations } from './verify-citations.js';
export {
  aggregateFixtureResults,
  buildGroundingMetadata,
  scoreFixture,
  sourceCoverage,
  sourcePrecision,
  summarizeGrounding,
} from './grounding.js';
export type { ScoreDeterministicCaseInput } from './deterministic.js';
export { scoreDeterministicCase } from './deterministic.js';
export { buildGroundingDistribution, buildReviewDistribution } from './metrics.js';
