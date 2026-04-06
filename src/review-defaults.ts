export const defaultReviewDimensions = [
  'accuracy',
  'completeness',
  'clarity',
  'tone',
  'actionability',
] as const;

export type DefaultReviewDimension = (typeof defaultReviewDimensions)[number];
