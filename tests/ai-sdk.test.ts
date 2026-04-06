import { createDraftReviewer, reviewDraft } from '@mundabra/ai-evals/ai-sdk';
import { NoOutputGeneratedError } from 'ai';
import { describe, expect, it, vi } from 'vitest';

describe('ai-sdk review helpers', () => {
  it('builds a prompt with the request, facts, draft, and truncation markers', async () => {
    let capturedPrompt = '';
    let capturedSystem = '';

    await reviewDraft(
      {
        userRequest: 'Draft a follow-up email to Acme after the pricing call.',
        retrievedFacts: 'B'.repeat(1_600),
        draftOutput: 'A'.repeat(6_000),
        reviewFocus: 'Customer-ready email quality',
      },
      {
        model: {} as never,
        generate: async (input) => {
          capturedPrompt = input.prompt;
          capturedSystem = input.system ?? '';

          return {
            output: {
              summary: 'Looks good.',
              verdict: 'approve',
              scores: {
                accuracy: 5,
                completeness: 4,
                clarity: 5,
                tone: 4,
                actionability: 4,
              },
            },
          } as Awaited<ReturnType<typeof import('ai').generateText>>;
        },
      },
    );

    expect(capturedSystem).toContain('internal quality gate');
    expect(capturedPrompt).toContain('Draft a follow-up email to Acme');
    expect(capturedPrompt).toContain('Customer-ready email quality');
    expect(capturedPrompt).toContain('[... draft truncated for review ...]');
    expect(capturedPrompt).toContain('[... facts truncated for review ...]');
    expect(capturedPrompt).toContain('accuracy, completeness, clarity, tone, actionability');
  });

  it('retries once after NoOutputGeneratedError', async () => {
    let attempts = 0;

    const result = await reviewDraft(
      {
        userRequest: 'Review this draft',
        draftOutput: 'Ready to send draft',
      },
      {
        model: {} as never,
        maxAttempts: 2,
        generate: async () => {
          attempts += 1;
          if (attempts === 1) {
            throw new NoOutputGeneratedError();
          }

          return {
            output: {
              summary: 'Looks good after retry.',
              verdict: 'approve',
              scores: {
                accuracy: 5,
                completeness: 4,
                clarity: 5,
                tone: 4,
                actionability: 4,
              },
              strengths: ['Grounded', 'Clear'],
              issues: [],
            },
          } as Awaited<ReturnType<typeof import('ai').generateText>>;
        },
      },
    );

    expect(attempts).toBe(2);
    expect(result.status).toBe('completed');
    if (result.status === 'completed') {
      expect(result.verdict).toBe('approve');
    }
  });

  it('returns failed after exhausting NoOutputGeneratedError retries', async () => {
    let attempts = 0;

    const result = await reviewDraft(
      {
        userRequest: 'Review this draft',
        draftOutput: 'Ready to send draft',
      },
      {
        model: {} as never,
        maxAttempts: 2,
        generate: async () => {
          attempts += 1;
          throw new NoOutputGeneratedError();
        },
      },
    );

    expect(attempts).toBe(2);
    expect(result).toEqual({
      status: 'failed',
      summary:
        'Draft review could not be completed. Do not present the draft as reviewed; if it is sensitive or externally facing, ask whether to proceed without review.',
      failureReason: 'No output generated.',
    });
  });

  it('rethrows programming errors', async () => {
    await expect(
      reviewDraft(
        {
          userRequest: 'Review this draft',
          draftOutput: 'Ready to send draft',
        },
        {
          model: {} as never,
          generate: async () => {
            throw new TypeError('bad configuration');
          },
        },
      ),
    ).rejects.toThrow('bad configuration');
  });

  it('supports custom dimensions through createDraftReviewer', async () => {
    const generate = vi.fn(async () => {
      return {
        output: {
          summary: 'Needs a tighter grounded rewrite.',
          verdict: 'revise_major',
          scores: {
            grounding: 2,
            concision: 4,
          },
          issues: [
            {
              severity: 'high',
              category: 'grounding',
              issue: 'One unsupported claim remains.',
              fix: 'Remove the unsupported customer commitment.',
            },
          ],
        },
      } as Awaited<ReturnType<typeof import('ai').generateText>>;
    });

    const reviewer = createDraftReviewer({
      model: {} as never,
      dimensions: ['grounding', 'concision'] as const,
      generate,
    });

    expect(reviewer.dimensions).toEqual(['grounding', 'concision']);

    const result = await reviewer.reviewDraft({
      userRequest: 'Review this draft',
      draftOutput: 'We already promised the customer same-day rollout.',
    });

    expect(generate).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('completed');
    if (result.status === 'completed') {
      expect(result.scores).toEqual({
        grounding: 2,
        concision: 4,
      });
      expect(result.issues?.[0]?.category).toBe('grounding');
    }
  });
});
