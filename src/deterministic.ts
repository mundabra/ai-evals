import type { DeterministicScoreResult, EvalCase, EvalExpectation, GroundingSummary } from './types.js';

const stopwords = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'into',
  'after',
  'before',
  'over',
  'under',
  'last',
  'will',
  'would',
  'could',
  'should',
  'have',
  'has',
  'had',
  'been',
  'being',
  'their',
  'they',
  'them',
  'your',
  'our',
  'there',
  'here',
  'about',
  'today',
]);

function normalizeMatchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeMatchText(value)
    .split(' ')
    .filter((token) => {
      if (token.length === 0) {
        return false;
      }

      if (/^\d+$/.test(token)) {
        return true;
      }

      return token.length >= 3 && !stopwords.has(token);
    });
}

function expectationCandidates(expectation: EvalExpectation): string[] {
  return [...new Set([expectation.label, ...(expectation.matchAny ?? [])])];
}

function exactMatch(normalizedOutput: string, expectation: EvalExpectation): boolean {
  return expectationCandidates(expectation).some((candidate) =>
    normalizedOutput.includes(normalizeMatchText(candidate))
  );
}

function requiredFactMatch(outputText: string, expectation: EvalExpectation): boolean {
  const normalizedOutput = normalizeMatchText(outputText);
  if (exactMatch(normalizedOutput, expectation)) {
    return true;
  }

  const outputTokens = new Set(tokenize(outputText));

  return expectationCandidates(expectation).some((candidate) => {
    const candidateTokens = [...new Set(tokenize(candidate))];
    if (candidateTokens.length === 0) {
      return false;
    }

    const matchedCount = candidateTokens.filter((token) => outputTokens.has(token)).length;
    const coverage = matchedCount / candidateTokens.length;

    if (candidateTokens.length <= 3) {
      return coverage === 1;
    }

    return coverage >= 0.75;
  });
}

function isApprovalCorrect(
  shouldRequireApproval: boolean | undefined,
  requiredApproval: string | null | undefined,
): boolean | null {
  if (typeof shouldRequireApproval !== 'boolean') {
    return null;
  }

  return shouldRequireApproval === Boolean(requiredApproval);
}

function isGroundingPresent(
  requireGrounding: boolean | undefined,
  grounding: GroundingSummary | null | undefined,
): boolean | null {
  if (!requireGrounding) {
    return null;
  }

  return Boolean(grounding);
}

export interface ScoreDeterministicCaseInput<
  RubricDimension extends string = string,
  OutputType extends string = string,
> {
  evalCase: EvalCase<RubricDimension, OutputType>;
  outputType?: OutputType | string | null;
  requiredApproval?: string | null;
  grounding?: GroundingSummary | null;
  outputText: string;
}

export function scoreDeterministicCase<
  RubricDimension extends string = string,
  OutputType extends string = string,
>(
  input: ScoreDeterministicCaseInput<RubricDimension, OutputType>,
): DeterministicScoreResult<RubricDimension, OutputType> {
  const normalizedOutput = normalizeMatchText(input.outputText);
  const requiredFacts = input.evalCase.expected.requiredFacts ?? [];
  const forbiddenClaims = input.evalCase.expected.forbiddenClaims ?? [];
  const requiredFactsMatched = requiredFacts
    .filter((fact) => requiredFactMatch(input.outputText, fact))
    .map((fact) => fact.label);
  const requiredFactsMissing = requiredFacts
    .filter((fact) => !requiredFactMatch(input.outputText, fact))
    .map((fact) => fact.label);
  const forbiddenClaimsPresent = forbiddenClaims
    .filter((claim) => exactMatch(normalizedOutput, claim))
    .map((claim) => claim.label);
  const outputTypeCorrect =
    input.evalCase.expected.outputType == null
      ? null
      : input.outputType === input.evalCase.expected.outputType;
  const approvalCorrect = isApprovalCorrect(
    input.evalCase.expected.shouldRequireApproval,
    input.requiredApproval,
  );
  const groundingPresent = isGroundingPresent(
    input.evalCase.expected.requireGrounding,
    input.grounding,
  );
  const requiredFactCoverage =
    requiredFacts.length === 0
      ? 1
      : Number((requiredFactsMatched.length / requiredFacts.length).toFixed(4));

  const checks = [outputTypeCorrect, approvalCorrect, groundingPresent].filter(
    (value): value is boolean => value !== null,
  );

  return {
    caseId: input.evalCase.id,
    outputType: input.outputType ?? null,
    deterministic: {
      deterministicPass:
        checks.every(Boolean) &&
        requiredFactsMissing.length === 0 &&
        forbiddenClaimsPresent.length === 0,
      outputTypeCorrect,
      approvalCorrect,
      groundingPresent,
      requiredFactsMatched,
      requiredFactsMissing,
      requiredFactCoverage,
      forbiddenClaimsPresent,
    },
    manualReviewRubric: [...(input.evalCase.expected.rubric ?? [])],
  };
}
