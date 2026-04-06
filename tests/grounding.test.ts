import {
  aggregateFixtureResults,
  scoreFixture,
  sourceCoverage,
  sourcePrecision,
  summarizeGrounding,
} from '@mundabra/ai-evals';
import { describe, expect, it } from 'vitest';
import { groundingFixtures } from './fixtures/grounding-fixtures';

describe('grounding helpers', () => {
  it('returns null when metadata is missing', () => {
    expect(summarizeGrounding(undefined)).toBeNull();
  });

  it('maps compact grounding fields', () => {
    expect(
      summarizeGrounding({
        verificationScope: 'source',
        status: 'partial',
        candidateCitationCount: 3,
        emittedCitationCount: 2,
        verifiedCitationCount: 2,
        removedCitationCount: 1,
        supportingSourceCount: 4,
        supportingSources: [],
        removedCitations: [],
      }),
    ).toEqual({
      verificationScope: 'source',
      status: 'partial',
      candidateCount: 3,
      attachedCount: 2,
      removedCount: 1,
      sourceCount: 4,
    });
  });

  it('computes source precision and coverage', () => {
    expect(
      sourcePrecision({
        verificationScope: 'source',
        status: 'partial',
        candidateCount: 4,
        attachedCount: 3,
        removedCount: 1,
        sourceCount: 4,
      }),
    ).toBe(0.75);

    expect(
      sourceCoverage({
        verificationScope: 'source',
        status: 'verified',
        candidateCount: 3,
        attachedCount: 3,
        removedCount: 0,
        sourceCount: 2,
      }),
    ).toBe(1);
  });

  it('reproduces the grounding fixture suite from personaOS', () => {
    const results = groundingFixtures.map(scoreFixture);
    const failures = results.filter((result) => !result.passed);

    expect(failures).toEqual([]);
    expect(aggregateFixtureResults(results)).toEqual({
      total: 14,
      passed: 14,
      byCategory: {
        valid_exact: { total: 2, passed: 2 },
        invalid: { total: 2, passed: 2 },
        mixed: { total: 2, passed: 2 },
        empty_sources: { total: 1, passed: 1 },
        empty_attached: { total: 1, passed: 1 },
        tool_capture: { total: 1, passed: 1 },
        url_normalization: { total: 2, passed: 2 },
        label_source_fallback: { total: 2, passed: 2 },
        ambiguity_rejection: { total: 1, passed: 1 },
      },
    });
  });
});
