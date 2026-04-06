import { runSuite } from '@mundabra/ai-evals';
import { describe, expect, it } from 'vitest';

describe('suite runner', () => {
  it('aggregates multiple cases and repetitions into a run artifact', async () => {
    const run = await runSuite({
      suiteName: 'smoke-suite',
      evaluatorName: 'suite-test',
      reps: 2,
      concurrency: 2,
      cases: [
        {
          id: 'case-a',
          title: 'Case A',
          tags: ['customer'],
          expected: {},
        },
        {
          id: 'case-b',
          title: 'Case B',
          tags: ['internal'],
          expected: {},
        },
      ],
      dimensions: ['accuracy'],
      metrics: ['metric.score'],
      metadata: { model: 'test-model' },
      evaluateCase: async ({ evalCase, repetition, runIndex }) => {
        const score = repetition === 1 ? runIndex + 1 : runIndex + 2;

        return {
          outputType: 'internal_summary',
          deterministic: {
            deterministicPass: evalCase.id === 'case-a',
            outputTypeCorrect: true,
            approvalCorrect: true,
            groundingPresent: true,
            requiredFactsMatched: evalCase.id === 'case-a' ? ['fact-1'] : [],
            requiredFactsMissing: evalCase.id === 'case-a' ? [] : ['fact-1'],
            requiredFactCoverage: evalCase.id === 'case-a' ? 1 : 0,
            forbiddenClaimsPresent: [],
          },
          review: {
            status: 'completed',
            verdict: evalCase.id === 'case-a' ? 'approve' : 'revise_minor',
            issueCount: evalCase.id === 'case-a' ? 0 : 1,
            scores: {
              accuracy: evalCase.id === 'case-a' ? 5 : 3,
            },
          },
          metrics: {
            score,
          },
        };
      },
    });

    expect(run.items).toHaveLength(4);
    expect(run.items[0]).toMatchObject({
      caseId: 'case-a',
      title: 'Case A',
      tags: ['customer'],
      repetition: 1,
      status: 'completed',
    });
    expect(run.items[3]).toMatchObject({
      caseId: 'case-b',
      repetition: 2,
    });
    expect(run.summary.totalItems).toBe(4);
    expect(run.summary.deterministic).toEqual({
      totalScored: 4,
      passes: 2,
      passRate: 0.5,
      avgRequiredFactCoverage: 0.5,
      totalForbiddenClaims: 0,
    });
    expect(run.summary.review).toEqual({
      totalReviews: 4,
      approve: 2,
      reviseMinor: 2,
      reviseMajor: 0,
      averageScores: {
        accuracy: 4,
      },
    });
    expect(run.summary.numericMetrics['metric.score']).toEqual({
      count: 4,
      mean: 3,
      min: 1,
      max: 5,
      stddev: 1.58,
      stderr: 0.79,
    });
    expect(run.config).toMatchObject({
      suiteName: 'smoke-suite',
      evaluatorName: 'suite-test',
      reps: 2,
      concurrency: 2,
      dimensions: ['accuracy'],
      metrics: ['metric.score'],
      metadata: {
        model: 'test-model',
      },
    });
  });

  it('captures evaluation failures as failed items instead of throwing', async () => {
    const run = await runSuite({
      suiteName: 'failure-suite',
      cases: [
        { id: 'case-ok', expected: {} },
        { id: 'case-fail', expected: {} },
      ],
      evaluateCase: async ({ evalCase }) => {
        if (evalCase.id === 'case-fail') {
          throw new Error('judge timed out');
        }

        return {
          deterministic: {
            deterministicPass: true,
            outputTypeCorrect: null,
            approvalCorrect: null,
            groundingPresent: null,
            requiredFactsMatched: [],
            requiredFactsMissing: [],
            requiredFactCoverage: 1,
            forbiddenClaimsPresent: [],
          },
        };
      },
    });

    expect(run.summary.totalItems).toBe(2);
    expect(run.summary.failedItems).toBe(1);
    expect(run.items[1]).toMatchObject({
      caseId: 'case-fail',
      status: 'failed',
      error: 'judge timed out',
    });
  });

  it('preserves case and repetition order under concurrency', async () => {
    const cases = Array.from({ length: 40 }, (_, index) => ({
      id: `case-${index + 1}`,
      title: `Case ${index + 1}`,
      expected: {},
    }));

    const run = await runSuite({
      suiteName: 'ordering-suite',
      cases,
      reps: 3,
      concurrency: 8,
      evaluateCase: async ({ evalCase, repetition, runIndex }) => {
        await new Promise((resolve) => setTimeout(resolve, runIndex % 3));

        return {
          repetition,
          metrics: {
            ordinal: runIndex + 1,
          },
        };
      },
    });

    expect(run.items).toHaveLength(120);
    expect(run.items.map((item) => `${item.caseId}:${item.repetition}`)).toEqual(
      Array.from({ length: 3 }, (_, repetitionIndex) =>
        cases.map((evalCase) => `${evalCase.id}:${repetitionIndex + 1}`)
      ).flat(),
    );
    expect(run.items[0]?.metrics?.ordinal).toBe(1);
    expect(run.items.at(-1)?.metrics?.ordinal).toBe(120);
  });
});
