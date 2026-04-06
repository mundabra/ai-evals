import { scoreDeterministicCase, type EvalCase } from '@mundabra/ai-evals';
import { describe, expect, it } from 'vitest';

const benchmarkCase: EvalCase<'fact_faithfulness' | 'task_state_accuracy', 'internal_summary'> = {
  id: 'seed-case',
  title: 'Seed case',
  expected: {
    outputType: 'internal_summary',
    shouldRequireApproval: false,
    requireGrounding: true,
    requiredFacts: [
      { label: 'legal approval pending', matchAny: ['legal approval is still pending', 'legal approval pending'] },
      { label: 'usage slipped 18%', matchAny: ['usage slipped 18%', '18% usage decline'] },
    ],
    forbiddenClaims: [
      { label: 'launch fully approved', matchAny: ['launch is fully approved'] },
    ],
    rubric: ['fact_faithfulness', 'task_state_accuracy'],
  },
};

describe('deterministic scoring', () => {
  it('flags missing facts and forbidden claims', () => {
    const result = scoreDeterministicCase({
      evalCase: benchmarkCase,
      outputType: 'call_prep',
      requiredApproval: 'draft_review',
      grounding: {
        verificationScope: 'source',
        status: 'partial',
        candidateCount: 2,
        attachedCount: 1,
        removedCount: 1,
        sourceCount: 2,
      },
      outputText:
        'Legal approval is still pending, but launch is fully approved and ready to send.',
    });

    expect(result.deterministic.outputTypeCorrect).toBe(false);
    expect(result.deterministic.approvalCorrect).toBe(false);
    expect(result.deterministic.requiredFactsMissing).toEqual(['usage slipped 18%']);
    expect(result.deterministic.forbiddenClaimsPresent).toEqual(['launch fully approved']);
    expect(result.deterministic.deterministicPass).toBe(false);
  });

  it('accepts paraphrased required facts through token coverage and aliases', () => {
    const result = scoreDeterministicCase({
      evalCase: benchmarkCase,
      outputType: 'internal_summary',
      requiredApproval: null,
      grounding: {
        verificationScope: 'source',
        status: 'verified',
        candidateCount: 2,
        attachedCount: 2,
        removedCount: 0,
        sourceCount: 2,
      },
      outputText:
        'Customer language still needs legal approval, and there was an 18% usage decline last quarter.',
    });

    expect(result.deterministic.requiredFactsMatched).toEqual([
      'legal approval pending',
      'usage slipped 18%',
    ]);
    expect(result.deterministic.requiredFactCoverage).toBe(1);
    expect(result.deterministic.deterministicPass).toBe(true);
    expect(result.manualReviewRubric).toEqual(['fact_faithfulness', 'task_state_accuracy']);
  });

  it('skips approval and grounding checks when the eval case does not require them', () => {
    const result = scoreDeterministicCase({
      evalCase: {
        id: 'simple-case',
        expected: {
          requiredFacts: [{ label: 'customer asked for pricing' }],
        },
      },
      outputText: 'The customer asked for pricing yesterday.',
    });

    expect(result.deterministic.outputTypeCorrect).toBeNull();
    expect(result.deterministic.approvalCorrect).toBeNull();
    expect(result.deterministic.groundingPresent).toBeNull();
    expect(result.deterministic.deterministicPass).toBe(true);
  });
});
