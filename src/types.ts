import type { DefaultReviewDimension } from './review-defaults.js';

export interface Citation {
  id: string;
  label: string;
  source: string;
}

export type SourceKind = 'prompt_document' | 'tool_document' | 'url';

export interface SourceEntry {
  id: string;
  kind: SourceKind;
  label: string;
  source: string;
  title?: string;
  url?: string;
  originTool?: string;
}

export interface RemovedCitation {
  id: string;
  label: string;
  source: string;
  reason: string;
}

export type GroundingVerificationScope = 'source';
export type GroundingStatus = 'pending' | 'verified' | 'partial' | 'unverified';

export interface GroundingSummary {
  verificationScope: GroundingVerificationScope;
  status: GroundingStatus;
  candidateCount: number;
  attachedCount: number;
  removedCount: number;
  sourceCount: number;
}

export interface GroundingMetadata {
  verificationScope: GroundingVerificationScope;
  status: GroundingStatus;
  candidateCitationCount: number;
  emittedCitationCount: number;
  verifiedCitationCount: number;
  removedCitationCount: number;
  supportingSourceCount: number;
  supportingSources: Array<{
    id: string;
    kind: SourceKind;
    label: string;
    source: string;
    url?: string;
  }>;
  removedCitations: RemovedCitation[];
}

export type GroundingFixtureCategory =
  | 'valid_exact'
  | 'invalid'
  | 'mixed'
  | 'empty_sources'
  | 'empty_attached'
  | 'tool_capture'
  | 'url_normalization'
  | 'label_source_fallback'
  | 'ambiguity_rejection';

export interface GroundingFixture {
  name: string;
  category: GroundingFixtureCategory;
  registryEntries: SourceEntry[];
  candidateCitations: Citation[];
  emittedCitations?: Citation[];
  toolCaptures?: Array<{
    toolName: string;
    output: unknown;
  }>;
  expected: GroundingSummary;
}

export interface GroundingFixtureResult {
  name: string;
  category: GroundingFixture['category'];
  passed: boolean;
  actual: GroundingSummary;
  expected: GroundingSummary;
}

export interface EvalExpectation {
  label: string;
  matchAny?: string[];
}

export interface EvalCaseExpected<RubricDimension extends string = string, OutputType extends string = string> {
  outputType?: OutputType | null;
  shouldRequireApproval?: boolean;
  requireGrounding?: boolean;
  requiredFacts?: EvalExpectation[];
  forbiddenClaims?: EvalExpectation[];
  rubric?: RubricDimension[];
}

export interface EvalCase<RubricDimension extends string = string, OutputType extends string = string> {
  id: string;
  title?: string;
  expected: EvalCaseExpected<RubricDimension, OutputType>;
  tags?: string[];
}

export interface DeterministicChecks {
  deterministicPass: boolean;
  outputTypeCorrect: boolean | null;
  approvalCorrect: boolean | null;
  groundingPresent: boolean | null;
  requiredFactsMatched: EvalExpectation['label'][];
  requiredFactsMissing: EvalExpectation['label'][];
  requiredFactCoverage: number;
  forbiddenClaimsPresent: EvalExpectation['label'][];
}

export interface DeterministicScoreResult<RubricDimension extends string = string, OutputType extends string = string> {
  caseId: string;
  outputType: OutputType | string | null;
  deterministic: DeterministicChecks;
  manualReviewRubric: RubricDimension[];
}

export interface GroundingMetricRecord<Group extends string = string> {
  status: GroundingStatus | string | null | undefined;
  group?: Group | null;
}

export type ReviewVerdict = 'approve' | 'revise_minor' | 'revise_major';
export type ReviewDimension = string;
export type ReviewScores<Dimension extends string = string> = Record<Dimension, number>;

export interface ReviewMetricRecord<Dimension extends string = DefaultReviewDimension> {
  verdict?: ReviewVerdict | string | null;
  scores?: Partial<Record<Dimension, number>> | null;
}
