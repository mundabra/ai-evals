import { buildGroundingDistribution, buildReviewDistribution, defaultReviewDimensions } from '@mundabra/ai-evals';
import { describe, expect, it } from 'vitest';

describe('metrics helpers', () => {
  it('counts verified, partial, pending, and unverified grounding rows', () => {
    expect(
      buildGroundingDistribution([
        { status: 'verified' },
        { status: 'partial' },
        { status: 'pending' },
        { status: 'unverified' },
        { status: 'ignored' },
      ]),
    ).toEqual({
      total: 4,
      verified: 1,
      partial: 1,
      unverified: 2,
    });
  });

  it('averages scores for the default review dimensions', () => {
    expect(defaultReviewDimensions).toEqual([
      'accuracy',
      'completeness',
      'clarity',
      'tone',
      'actionability',
    ]);

    expect(
      buildReviewDistribution([
        {
          verdict: 'approve',
          scores: {
            accuracy: 5,
            completeness: 4,
            clarity: 4,
            tone: 5,
            actionability: 4,
          },
        },
        {
          verdict: 'revise_minor',
          scores: {
            accuracy: 3,
            completeness: 4,
            clarity: 5,
            tone: 4,
            actionability: 5,
          },
        },
        {
          verdict: null,
          scores: null,
        },
      ]),
    ).toEqual({
      totalReviews: 3,
      approve: 1,
      reviseMinor: 1,
      reviseMajor: 0,
      averageScores: {
        accuracy: 4,
        completeness: 4,
        clarity: 4.5,
        tone: 4.5,
        actionability: 4.5,
      },
    });
  });

  it('supports custom review dimensions', () => {
    expect(
      buildReviewDistribution(
        [
          {
            verdict: 'revise_major',
            scores: {
              grounding: 2,
              concision: 4,
            },
          },
          {
            verdict: 'approve',
            scores: {
              grounding: 4,
              concision: 5,
            },
          },
        ],
        {
          dimensions: ['grounding', 'concision'] as const,
        },
      ),
    ).toEqual({
      totalReviews: 2,
      approve: 1,
      reviseMinor: 0,
      reviseMajor: 1,
      averageScores: {
        grounding: 3,
        concision: 4.5,
      },
    });
  });
});
