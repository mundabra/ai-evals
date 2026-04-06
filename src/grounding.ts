import type {
  Citation,
  GroundingFixture,
  GroundingFixtureResult,
  GroundingMetadata,
  GroundingSummary,
  RemovedCitation,
} from './types.js';
import { SourceRegistry } from './source-registry.js';
import { verifyCitations } from './verify-citations.js';

const maxSupportingSources = 12;

export function buildGroundingMetadata(input: {
  candidateCitations: Citation[];
  emittedCitations: Citation[];
  registry: SourceRegistry;
  removedCitations: RemovedCitation[];
}): GroundingMetadata {
  const supportingSources = input.registry
    .listEntries()
    .slice(0, maxSupportingSources)
    .map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      label: entry.label,
      source: entry.source,
      ...(entry.url ? { url: entry.url } : {}),
    }));

  const supportingSourceCount = input.registry.listEntries().length;
  const removedCitationCount = input.removedCitations.length;
  const emittedCitationCount = input.emittedCitations.length;

  let status: GroundingMetadata['status'] = 'unverified';
  if (emittedCitationCount > 0 && removedCitationCount === 0) {
    status = 'verified';
  } else if (emittedCitationCount > 0 && removedCitationCount > 0) {
    status = 'partial';
  }

  return {
    verificationScope: 'source',
    status,
    candidateCitationCount: input.candidateCitations.length,
    emittedCitationCount,
    verifiedCitationCount: emittedCitationCount,
    removedCitationCount,
    supportingSourceCount,
    supportingSources,
    removedCitations: input.removedCitations,
  };
}

export function summarizeGrounding(grounding: GroundingMetadata | undefined): GroundingSummary | null {
  if (!grounding) {
    return null;
  }

  return {
    verificationScope: grounding.verificationScope,
    status: grounding.status,
    candidateCount: grounding.candidateCitationCount,
    attachedCount: grounding.emittedCitationCount,
    removedCount: grounding.removedCitationCount,
    sourceCount: grounding.supportingSourceCount,
  };
}

export function scoreFixture(fixture: GroundingFixture): GroundingFixtureResult {
  const registry = new SourceRegistry();

  for (const entry of fixture.registryEntries) {
    registry.add(entry);
  }

  for (const capture of fixture.toolCaptures ?? []) {
    registry.captureToolResult(capture.toolName, capture.output);
  }

  const emittedCitations = fixture.emittedCitations ?? fixture.candidateCitations;
  const verification = verifyCitations(emittedCitations, registry);
  const metadata = buildGroundingMetadata({
    candidateCitations: fixture.candidateCitations,
    emittedCitations: verification.verifiedCitations,
    registry,
    removedCitations: verification.removedCitations,
  });
  const actual = summarizeGrounding(metadata) ?? {
    verificationScope: 'source',
    status: 'unverified',
    candidateCount: 0,
    attachedCount: 0,
    removedCount: 0,
    sourceCount: 0,
  };

  return {
    name: fixture.name,
    category: fixture.category,
    passed: JSON.stringify(actual) === JSON.stringify(fixture.expected),
    actual,
    expected: fixture.expected,
  };
}

export function aggregateFixtureResults(results: GroundingFixtureResult[]): {
  total: number;
  passed: number;
  byCategory: Record<string, { total: number; passed: number }>;
} {
  const byCategory: Record<string, { total: number; passed: number }> = {};

  for (const result of results) {
    const current = byCategory[result.category] ?? { total: 0, passed: 0 };
    current.total += 1;
    current.passed += result.passed ? 1 : 0;
    byCategory[result.category] = current;
  }

  return {
    total: results.length,
    passed: results.filter((result) => result.passed).length,
    byCategory,
  };
}

export function sourcePrecision(summary: GroundingSummary): number | null {
  if (summary.candidateCount === 0) {
    return null;
  }

  return summary.attachedCount / summary.candidateCount;
}

export function sourceCoverage(summary: GroundingSummary): number | null {
  if (summary.sourceCount === 0) {
    return null;
  }

  return Math.min(summary.attachedCount, summary.sourceCount) / summary.sourceCount;
}
