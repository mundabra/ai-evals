import { NoOutputGeneratedError, Output, generateText } from 'ai';
import { z } from 'zod';
import { defaultReviewDimensions } from './review-defaults.js';

const defaultMaxRetrievedFactsChars = 1_500;
const defaultMaxDraftChars = 5_000;
const defaultMaxAttempts = 2;
const defaultMaxOutputTokens = 1_400;

export type ReviewDimension = string;
export type ReviewVerdict = 'approve' | 'revise_minor' | 'revise_major';
export type ReviewScores<Dimension extends string = string> = Record<Dimension, number>;

export interface ReviewIssue<Dimension extends string = string> {
  severity: 'high' | 'medium' | 'low';
  category: Dimension;
  issue: string;
  fix: string;
}

export interface ReviewRequest {
  userRequest: string;
  draftOutput: string;
  retrievedFacts?: string;
  reviewFocus?: string;
}

export interface CompletedReviewResult<Dimension extends string = string> {
  status: 'completed';
  summary: string;
  verdict: ReviewVerdict;
  scores: ReviewScores<Dimension>;
  strengths?: string[];
  issues?: Array<ReviewIssue<Dimension>>;
  revisedDraft?: string;
}

export interface FailedReviewResult {
  status: 'failed';
  summary: string;
  failureReason: string;
}

export type ReviewResult<Dimension extends string = string> =
  | CompletedReviewResult<Dimension>
  | FailedReviewResult;

type GenerateTextFn = typeof generateText;
type ReviewModel = Parameters<GenerateTextFn>[0]['model'];

export interface ReviewOptions<Dimension extends string = string> {
  model: ReviewModel;
  generate?: GenerateTextFn;
  maxAttempts?: number;
  dimensions?: readonly Dimension[];
  maxRetrievedFactsChars?: number;
  maxDraftChars?: number;
  maxOutputTokens?: number;
}

export interface DraftReviewer<Dimension extends string = string> {
  dimensions: readonly Dimension[];
  reviewDraft: (request: ReviewRequest, overrides?: Omit<ReviewOptions<Dimension>, 'model' | 'generate'>) =>
    Promise<ReviewResult<Dimension>>;
}

function truncateSection(value: string, limit: number, label: string): string {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit)}\n\n[... ${label} truncated for review ...]`;
}

function resolveDimensions<Dimension extends string>(
  dimensions?: readonly Dimension[],
): readonly Dimension[] {
  if (dimensions && dimensions.length > 0) {
    return dimensions;
  }

  return defaultReviewDimensions as unknown as readonly Dimension[];
}

function buildScoreSchema(dimensions: readonly string[]) {
  return z.object(
    Object.fromEntries(dimensions.map((dimension) => [dimension, z.number().int().min(1).max(5)])),
  );
}

function buildIssueSchema(dimensions: readonly string[]) {
  return z.object({
    severity: z.enum(['high', 'medium', 'low']),
    category: z
      .string()
      .min(1)
      .refine((value) => dimensions.includes(value), 'Invalid review dimension'),
    issue: z.string().min(1),
    fix: z.string().min(1),
  });
}

function buildReviewSchema(dimensions: readonly string[]) {
  const scores = buildScoreSchema(dimensions);
  const issues = buildIssueSchema(dimensions);

  return z.object({
    summary: z.string().min(1),
    verdict: z.enum(['approve', 'revise_minor', 'revise_major']),
    scores,
    strengths: z.array(z.string()).optional(),
    issues: z.array(issues).optional(),
    revisedDraft: z.string().optional(),
  });
}

function buildReviewSystemPrompt(): string {
  return [
    'You are a specialist draft reviewer acting as an internal quality gate.',
    'Review the draft against the original request and any supplied facts.',
    'Prefer concrete, high-signal feedback over generic praise.',
    'Mark unsupported claims as accuracy issues.',
    'Only include revisedDraft when changes would materially improve the output.',
    'A verdict of approve means the draft is ready to send with minimal risk.',
  ].join('\n');
}

function buildReviewPrompt(
  request: ReviewRequest,
  dimensions: readonly string[],
  options: Pick<ReviewOptions, 'maxDraftChars' | 'maxRetrievedFactsChars'>,
): string {
  const facts = truncateSection(
    request.retrievedFacts?.trim() || '(none provided)',
    options.maxRetrievedFactsChars ?? defaultMaxRetrievedFactsChars,
    'facts',
  );
  const draft = truncateSection(
    request.draftOutput.trim() || '(no draft provided)',
    options.maxDraftChars ?? defaultMaxDraftChars,
    'draft',
  );

  return [
    '## Original request',
    request.userRequest,
    '',
    '## Review focus',
    request.reviewFocus?.trim() || 'Readiness to deliver a strong draft',
    '',
    '## Supporting facts',
    facts,
    '',
    '## Draft to review',
    draft,
    '',
    '## Scoring dimensions',
    dimensions.join(', '),
    '',
    '## Your task',
    'Return a structured review with a verdict, 1-5 scores for every scoring dimension, concrete issues, and a revised draft only when the current draft needs material improvement.',
  ].join('\n');
}

function buildReviewFailure(error: unknown): FailedReviewResult {
  const message = error instanceof Error ? error.message : 'unknown error';

  return {
    status: 'failed',
    summary:
      'Draft review could not be completed. Do not present the draft as reviewed; if it is sensitive or externally facing, ask whether to proceed without review.',
    failureReason: message,
  };
}

export async function reviewDraft<Dimension extends string = string>(
  request: ReviewRequest,
  options: ReviewOptions<Dimension>,
): Promise<ReviewResult<Dimension>> {
  const dimensions = resolveDimensions(options.dimensions);
  const system = buildReviewSystemPrompt();
  const prompt = buildReviewPrompt(request, dimensions, options);
  const reviewSchema = buildReviewSchema(dimensions as readonly string[]);
  const generate = options.generate ?? generateText;
  const maxAttempts = options.maxAttempts ?? defaultMaxAttempts;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const { output } = await generate({
        model: options.model,
        maxOutputTokens: options.maxOutputTokens ?? defaultMaxOutputTokens,
        system,
        prompt,
        output: Output.object({
          schema: reviewSchema,
          name: 'draft_review',
          description: 'A structured internal review for a near-final draft.',
        }),
      });

      return {
        status: 'completed',
        summary: output.summary,
        verdict: output.verdict,
        scores: output.scores as ReviewScores<Dimension>,
        strengths: output.strengths?.slice(0, 4),
        issues: output.issues?.slice(0, 6) as Array<ReviewIssue<Dimension>> | undefined,
        revisedDraft: output.revisedDraft,
      };
    } catch (error) {
      if (error instanceof TypeError || error instanceof ReferenceError || error instanceof SyntaxError) {
        throw error;
      }

      lastError = error;

      if (NoOutputGeneratedError.isInstance(error) && attempt < maxAttempts) {
        continue;
      }

      break;
    }
  }

  return buildReviewFailure(lastError);
}

export function createDraftReviewer<Dimension extends string = string>(
  options: ReviewOptions<Dimension>,
): DraftReviewer<Dimension> {
  const dimensions = resolveDimensions(options.dimensions);

  return {
    dimensions,
    reviewDraft: (request, overrides) =>
      reviewDraft(request, {
        ...options,
        ...overrides,
        dimensions: overrides?.dimensions ?? dimensions,
      }),
  };
}

export { defaultReviewDimensions };
