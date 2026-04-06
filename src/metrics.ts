import { defaultReviewDimensions } from './review-defaults.js';
import type {
  GroundingMetricRecord,
  GroundingStatus,
  ReviewMetricRecord,
  ReviewVerdict,
} from './types.js';

function roundRate(value: number): number {
  return Number(value.toFixed(4));
}

function roundAverage(value: number): number {
  return Number(value.toFixed(2));
}

function normalizeGroundingStatus(
  status: GroundingMetricRecord['status'],
): Exclude<GroundingStatus, 'pending'> | null {
  if (status === 'verified' || status === 'partial' || status === 'unverified') {
    return status;
  }

  if (status === 'pending') {
    return 'unverified';
  }

  return null;
}

function normalizeReviewVerdict(verdict: ReviewMetricRecord['verdict']): ReviewVerdict | null {
  if (verdict === 'approve' || verdict === 'revise_minor' || verdict === 'revise_major') {
    return verdict;
  }

  return null;
}

export function buildGroundingDistribution(records: GroundingMetricRecord[]): {
  total: number;
  verified: number;
  partial: number;
  unverified: number;
} {
  const counts = {
    total: 0,
    verified: 0,
    partial: 0,
    unverified: 0,
  };

  for (const record of records) {
    const status = normalizeGroundingStatus(record.status);
    if (!status) {
      continue;
    }

    counts.total += 1;
    counts[status] += 1;
  }

  return counts;
}

export function buildReviewDistribution<Dimension extends string = string>(
  records: ReviewMetricRecord<Dimension>[],
  options?: { dimensions?: readonly Dimension[] },
): {
  totalReviews: number;
  approve: number;
  reviseMinor: number;
  reviseMajor: number;
  averageScores: Record<string, number>;
} {
  const dimensions = [...(options?.dimensions ?? defaultReviewDimensions)] as string[];
  const totalScores = Object.fromEntries(dimensions.map((dimension) => [dimension, 0]));
  const scoreCounts = Object.fromEntries(dimensions.map((dimension) => [dimension, 0]));

  let approve = 0;
  let reviseMinor = 0;
  let reviseMajor = 0;

  for (const record of records) {
    const verdict = normalizeReviewVerdict(record.verdict);
    const scores = record.scores ?? null;

    if (verdict === 'approve') {
      approve += 1;
    } else if (verdict === 'revise_minor') {
      reviseMinor += 1;
    } else if (verdict === 'revise_major') {
      reviseMajor += 1;
    }

    if (!scores) {
      continue;
    }

    for (const dimension of dimensions) {
      const score = scores[dimension as keyof typeof scores];
      if (typeof score !== 'number' || !Number.isFinite(score)) {
        continue;
      }

      totalScores[dimension] += score;
      scoreCounts[dimension] += 1;
    }
  }

  const averageScores = Object.fromEntries(
    dimensions.map((dimension) => [
      dimension,
      scoreCounts[dimension] === 0 ? 0 : roundAverage(totalScores[dimension] / scoreCounts[dimension]),
    ]),
  );

  return {
    totalReviews: records.length,
    approve,
    reviseMinor,
    reviseMajor,
    averageScores,
  };
}

export { defaultReviewDimensions, roundAverage, roundRate };
