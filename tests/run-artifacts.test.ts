import {
  buildRunArtifact,
  exportLocalCsv,
  exportLocalJson,
  writeRunArtifacts,
  type EvalRunItem,
} from '@mundabra/ai-evals';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map(async (dir) => {
      await rm(dir, { force: true, recursive: true });
    }),
  );
});

function makeItems(): EvalRunItem[] {
  return [
    {
      caseId: 'case-1',
      title: 'Case 1',
      repetition: 1,
      status: 'completed',
      outputType: 'follow_up_email',
      durationMs: 120,
      deterministic: {
        deterministicPass: true,
        outputTypeCorrect: true,
        approvalCorrect: true,
        groundingPresent: true,
        requiredFactsMatched: ['fact-a', 'fact-b'],
        requiredFactsMissing: [],
        requiredFactCoverage: 1,
        forbiddenClaimsPresent: [],
      },
      grounding: {
        verificationScope: 'source',
        status: 'verified',
        candidateCount: 2,
        attachedCount: 2,
        removedCount: 0,
        sourceCount: 2,
      },
      review: {
        status: 'completed',
        verdict: 'approve',
        issueCount: 0,
        scores: {
          accuracy: 5,
          clarity: 4,
        },
      },
      metrics: {
        latency_budget_used: 0.4,
      },
    },
    {
      caseId: 'case-2',
      title: 'Case 2',
      repetition: 1,
      status: 'completed',
      outputType: 'follow_up_email',
      durationMs: 180,
      deterministic: {
        deterministicPass: false,
        outputTypeCorrect: true,
        approvalCorrect: false,
        groundingPresent: true,
        requiredFactsMatched: ['fact-a'],
        requiredFactsMissing: ['fact-b'],
        requiredFactCoverage: 0.5,
        forbiddenClaimsPresent: ['forbidden-a'],
      },
      grounding: {
        verificationScope: 'source',
        status: 'partial',
        candidateCount: 2,
        attachedCount: 1,
        removedCount: 1,
        sourceCount: 2,
      },
      review: {
        status: 'completed',
        verdict: 'revise_minor',
        issueCount: 2,
        scores: {
          accuracy: 3,
          clarity: 5,
        },
      },
      metrics: {
        latency_budget_used: 0.7,
      },
    },
  ];
}

describe('run artifacts', () => {
  it('builds stable run summaries and derived metric stats', () => {
    const run = buildRunArtifact({
      suiteName: 'customer-drafts',
      evaluatorName: 'local-regression',
      runId: 'run-123',
      generatedAt: '2026-04-06T00:00:00.000Z',
      durationMs: 500,
      reps: 1,
      concurrency: 2,
      items: makeItems(),
      dimensions: ['accuracy', 'clarity'],
      metrics: ['metric.latency_budget_used'],
      metadata: {
        model: 'gpt-4o-mini',
      },
    });

    expect(run.runId).toBe('run-123');
    expect(run.summary).toEqual({
      totalItems: 2,
      completedItems: 2,
      failedItems: 0,
      durationMs: 500,
      deterministic: {
        totalScored: 2,
        passes: 1,
        passRate: 0.5,
        avgRequiredFactCoverage: 0.75,
        totalForbiddenClaims: 1,
      },
      grounding: {
        total: 2,
        verified: 1,
        partial: 1,
        unverified: 0,
      },
      review: {
        totalReviews: 2,
        approve: 1,
        reviseMinor: 1,
        reviseMajor: 0,
        averageScores: {
          accuracy: 4,
          clarity: 4.5,
        },
      },
      numericMetrics: {
        'deterministic.approvalCorrect': {
          count: 2,
          mean: 0.5,
          min: 0,
          max: 1,
          stddev: 0.5,
          stderr: 0.35,
        },
        'deterministic.forbiddenClaimCount': {
          count: 2,
          mean: 0.5,
          min: 0,
          max: 1,
          stddev: 0.5,
          stderr: 0.35,
        },
        'deterministic.groundingPresent': {
          count: 2,
          mean: 1,
          min: 1,
          max: 1,
          stddev: 0,
          stderr: 0,
        },
        'deterministic.outputTypeCorrect': {
          count: 2,
          mean: 1,
          min: 1,
          max: 1,
          stddev: 0,
          stderr: 0,
        },
        'deterministic.pass': {
          count: 2,
          mean: 0.5,
          min: 0,
          max: 1,
          stddev: 0.5,
          stderr: 0.35,
        },
        'deterministic.requiredFactCoverage': {
          count: 2,
          mean: 0.75,
          min: 0.5,
          max: 1,
          stddev: 0.25,
          stderr: 0.18,
        },
        'deterministic.requiredFactsMatchedCount': {
          count: 2,
          mean: 1.5,
          min: 1,
          max: 2,
          stddev: 0.5,
          stderr: 0.35,
        },
        'deterministic.requiredFactsMissingCount': {
          count: 2,
          mean: 0.5,
          min: 0,
          max: 1,
          stddev: 0.5,
          stderr: 0.35,
        },
        'metric.latency_budget_used': {
          count: 2,
          mean: 0.55,
          min: 0.4,
          max: 0.7,
          stddev: 0.15,
          stderr: 0.11,
        },
        'review.issueCount': {
          count: 2,
          mean: 1,
          min: 0,
          max: 2,
          stddev: 1,
          stderr: 0.71,
        },
        'review.score.accuracy': {
          count: 2,
          mean: 4,
          min: 3,
          max: 5,
          stddev: 1,
          stderr: 0.71,
        },
        'review.score.clarity': {
          count: 2,
          mean: 4.5,
          min: 4,
          max: 5,
          stddev: 0.5,
          stderr: 0.35,
        },
        'runtime.durationMs': {
          count: 2,
          mean: 150,
          min: 120,
          max: 180,
          stddev: 30,
          stderr: 21.21,
        },
      },
    });
    expect(run.report.headline).toContain('customer-drafts');
    expect(run.config).toEqual({
      suiteName: 'customer-drafts',
      evaluatorName: 'local-regression',
      reps: 1,
      concurrency: 2,
      dimensions: ['accuracy', 'clarity'],
      metrics: ['metric.latency_budget_used'],
      metadata: {
        model: 'gpt-4o-mini',
      },
      packageName: '@mundabra/ai-evals',
      packageVersion: '0.1.0-beta.0',
    });
  });

  it('exports local JSON and CSV views', () => {
    const run = buildRunArtifact({
      suiteName: 'customer-drafts',
      items: makeItems(),
      dimensions: ['accuracy', 'clarity'],
    });

    expect(exportLocalJson(run)).toMatchObject({
      runConfig: {
        suiteName: 'customer-drafts',
      },
      results: {
        totalItems: 2,
      },
      report: {
        headline: expect.any(String),
      },
      items: expect.any(Array),
    });

    expect(exportLocalCsv(run, { metrics: ['review.score.accuracy', 'metric.latency_budget_used'] })).toBe(
      [
        'caseId,title,status,repetition,outputType,deterministicPass,requiredFactCoverage,requiredFactsMissingCount,forbiddenClaimCount,approvalCorrect,groundingPresent,groundingStatus,reviewStatus,reviewVerdict,reviewIssueCount,durationMs,error,review.score.accuracy,metric.latency_budget_used',
        'case-1,Case 1,completed,1,follow_up_email,true,1,0,0,true,true,verified,completed,approve,0,120,,5,0.4',
        'case-2,Case 2,completed,1,follow_up_email,false,0.5,1,1,false,true,partial,completed,revise_minor,2,180,,3,0.7',
        '',
      ].join('\n'),
    );
  });

  it('writes standard artifact files', async () => {
    const run = buildRunArtifact({
      suiteName: 'customer-drafts',
      runId: 'run-files',
      generatedAt: '2026-04-06T00:00:00.000Z',
      items: makeItems(),
      dimensions: ['accuracy', 'clarity'],
    });

    const outputDir = await mkdtemp(join(tmpdir(), 'ai-evals-'));
    tempDirs.push(outputDir);

    const paths = await writeRunArtifacts(run, {
      outputDir,
      csv: {
        metrics: ['review.score.accuracy'],
      },
    });

    expect(paths).toEqual({
      resultsPath: join(outputDir, 'results.json'),
      reportPath: join(outputDir, 'report.json'),
      runConfigPath: join(outputDir, 'run_config.json'),
      itemsPath: join(outputDir, 'items.jsonl'),
      csvPath: join(outputDir, 'items.csv'),
    });

    expect(JSON.parse(await readFile(paths.resultsPath, 'utf8'))).toMatchObject({
      totalItems: 2,
      deterministic: {
        passRate: 0.5,
      },
    });
    expect(JSON.parse(await readFile(paths.runConfigPath, 'utf8'))).toMatchObject({
      suiteName: 'customer-drafts',
    });
    expect((await readFile(paths.itemsPath, 'utf8')).trim().split('\n')).toHaveLength(2);
    expect(await readFile(paths.csvPath!, 'utf8')).toContain('review.score.accuracy');
  });
});
