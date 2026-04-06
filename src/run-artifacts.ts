import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildGroundingDistribution, buildReviewDistribution, roundAverage, roundRate } from './metrics.js';
import { packageName as defaultPackageName, packageVersion as defaultPackageVersion } from './version.js';
import type {
  DeterministicChecks,
  EvalRun,
  EvalRunConfig,
  EvalRunItem,
  EvalRunReport,
  EvalRunSummary,
  GroundingSummary,
  LocalRunConfigExport,
  NumericMetricSummary,
  ReviewMetricRecord,
} from './types.js';

function summarizeDeterministic(items: EvalRunItem[]): EvalRunSummary['deterministic'] {
  const deterministicItems = items
    .map((item) => item.deterministic)
    .filter((item): item is DeterministicChecks => Boolean(item));

  if (deterministicItems.length === 0) {
    return {
      totalScored: 0,
      passes: 0,
      passRate: 0,
      avgRequiredFactCoverage: 0,
      totalForbiddenClaims: 0,
    };
  }

  const passes = deterministicItems.filter((item) => item.deterministicPass).length;
  const avgRequiredFactCoverage = roundAverage(
    deterministicItems.reduce((total, item) => total + item.requiredFactCoverage, 0) / deterministicItems.length,
  );

  return {
    totalScored: deterministicItems.length,
    passes,
    passRate: roundRate(passes / deterministicItems.length),
    avgRequiredFactCoverage,
    totalForbiddenClaims: deterministicItems.reduce(
      (total, item) => total + item.forbiddenClaimsPresent.length,
      0,
    ),
  };
}

function collectReviewDimensions(items: EvalRunItem[], dimensions?: readonly string[]): string[] {
  if (dimensions && dimensions.length > 0) {
    return [...new Set(dimensions)];
  }

  const collected = new Set<string>();
  for (const item of items) {
    for (const dimension of Object.keys(item.review?.scores ?? {})) {
      collected.add(dimension);
    }
  }

  return [...collected];
}

function buildLocalRunConfigExport(
  run: Pick<EvalRun, 'runId' | 'generatedAt' | 'config'>,
): LocalRunConfigExport {
  return {
    runId: run.runId,
    generatedAt: run.generatedAt,
    ...run.config,
  };
}

function deriveNumericMetrics(item: EvalRunItem): Record<string, number> {
  const metrics: Record<string, number> = {};

  if (item.deterministic) {
    metrics['deterministic.pass'] = item.deterministic.deterministicPass ? 1 : 0;
    metrics['deterministic.requiredFactCoverage'] = item.deterministic.requiredFactCoverage;
    metrics['deterministic.requiredFactsMatchedCount'] = item.deterministic.requiredFactsMatched.length;
    metrics['deterministic.requiredFactsMissingCount'] = item.deterministic.requiredFactsMissing.length;
    metrics['deterministic.forbiddenClaimCount'] = item.deterministic.forbiddenClaimsPresent.length;

    if (item.deterministic.outputTypeCorrect !== null) {
      metrics['deterministic.outputTypeCorrect'] = item.deterministic.outputTypeCorrect ? 1 : 0;
    }
    if (item.deterministic.approvalCorrect !== null) {
      metrics['deterministic.approvalCorrect'] = item.deterministic.approvalCorrect ? 1 : 0;
    }
    if (item.deterministic.groundingPresent !== null) {
      metrics['deterministic.groundingPresent'] = item.deterministic.groundingPresent ? 1 : 0;
    }
  }

  if (item.review?.scores) {
    for (const [dimension, score] of Object.entries(item.review.scores)) {
      if (typeof score === 'number' && Number.isFinite(score)) {
        metrics[`review.score.${dimension}`] = score;
      }
    }
  }

  if (typeof item.review?.issueCount === 'number') {
    metrics['review.issueCount'] = item.review.issueCount;
  }

  if (typeof item.durationMs === 'number') {
    metrics['runtime.durationMs'] = item.durationMs;
  }

  for (const [key, value] of Object.entries(item.metrics ?? {})) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      metrics[`metric.${key}`] = value;
    }
  }

  return metrics;
}

function summarizeNumericMetrics(items: EvalRunItem[]): Record<string, NumericMetricSummary> {
  const valuesByMetric = new Map<string, number[]>();

  for (const item of items) {
    const derived = deriveNumericMetrics(item);
    for (const [metric, value] of Object.entries(derived)) {
      const current = valuesByMetric.get(metric) ?? [];
      current.push(value);
      valuesByMetric.set(metric, current);
    }
  }

  const summary: Record<string, NumericMetricSummary> = {};

  for (const [metric, values] of valuesByMetric.entries()) {
    const count = values.length;
    const mean = values.reduce((total, value) => total + value, 0) / count;
    const variance =
      count <= 1
        ? 0
        : values.reduce((total, value) => total + (value - mean) ** 2, 0) / count;
    const stddev = Math.sqrt(variance);

    summary[metric] = {
      count,
      mean: roundAverage(mean),
      min: roundAverage(Math.min(...values)),
      max: roundAverage(Math.max(...values)),
      stddev: roundAverage(stddev),
      stderr: roundAverage(count <= 1 ? 0 : stddev / Math.sqrt(count)),
    };
  }

  return Object.fromEntries(Object.entries(summary).sort(([left], [right]) => left.localeCompare(right)));
}

function buildRunReport(run: {
  suiteName: string;
  generatedAt: string;
  summary: EvalRunSummary;
}): EvalRunReport {
  const headline = `${run.suiteName}: ${run.summary.completedItems}/${run.summary.totalItems} items completed`;
  const keyMetrics: Record<string, number | string> = {
    totalItems: run.summary.totalItems,
    failedItems: run.summary.failedItems,
    deterministicPassRate: run.summary.deterministic.passRate,
    avgRequiredFactCoverage: run.summary.deterministic.avgRequiredFactCoverage,
  };

  if (run.summary.grounding.total > 0) {
    keyMetrics.verifiedGrounding = run.summary.grounding.verified;
    keyMetrics.partialGrounding = run.summary.grounding.partial;
    keyMetrics.unverifiedGrounding = run.summary.grounding.unverified;
  }

  if (run.summary.review.totalReviews > 0) {
    keyMetrics.approve = run.summary.review.approve;
    keyMetrics.reviseMinor = run.summary.review.reviseMinor;
    keyMetrics.reviseMajor = run.summary.review.reviseMajor;
  }

  const summaryLines = [
    `Generated at ${run.generatedAt}`,
    `${run.summary.completedItems} completed, ${run.summary.failedItems} failed`,
    `Deterministic pass rate: ${run.summary.deterministic.passRate}`,
    `Average required fact coverage: ${run.summary.deterministic.avgRequiredFactCoverage}`,
  ];

  if (run.summary.grounding.total > 0) {
    summaryLines.push(
      `Grounding distribution: verified=${run.summary.grounding.verified}, partial=${run.summary.grounding.partial}, unverified=${run.summary.grounding.unverified}`,
    );
  }

  if (run.summary.review.totalReviews > 0) {
    summaryLines.push(
      `Review distribution: approve=${run.summary.review.approve}, revise_minor=${run.summary.review.reviseMinor}, revise_major=${run.summary.review.reviseMajor}`,
    );
  }

  return {
    headline,
    keyMetrics,
    summaryLines,
  };
}

export interface BuildRunArtifactInput<Dimension extends string = string, OutputType extends string = string> {
  suiteName: string;
  items: Array<EvalRunItem<Dimension, OutputType>>;
  evaluatorName?: string;
  runId?: string;
  generatedAt?: string;
  durationMs?: number | null;
  reps?: number;
  concurrency?: number;
  dimensions?: readonly string[];
  metrics?: readonly string[];
  metadata?: Record<string, unknown> | null;
  packageName?: string;
  packageVersion?: string;
}

export function buildRunArtifact<Dimension extends string = string, OutputType extends string = string>(
  input: BuildRunArtifactInput<Dimension, OutputType>,
): EvalRun<Dimension, OutputType> {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const runId = input.runId ?? globalThis.crypto.randomUUID();
  const deterministic = summarizeDeterministic(input.items);
  const groundingRows = input.items
    .map((item) => item.grounding)
    .filter((item): item is GroundingSummary => Boolean(item))
    .map((item) => ({ status: item.status }));
  const grounding = buildGroundingDistribution(groundingRows);
  const reviewDimensions = collectReviewDimensions(input.items, input.dimensions);
  const review = buildReviewDistribution(
    input.items
      .map((item) => item.review)
      .filter((item): item is NonNullable<EvalRunItem['review']> => Boolean(item))
      .map(
        (item) =>
          ({
            verdict: item.verdict,
            scores: item.scores,
          }) satisfies ReviewMetricRecord,
      ),
    {
      dimensions: reviewDimensions,
    },
  );
  const summary: EvalRunSummary = {
    totalItems: input.items.length,
    completedItems: input.items.filter((item) => item.status !== 'failed').length,
    failedItems: input.items.filter((item) => item.status === 'failed').length,
    durationMs: input.durationMs ?? null,
    deterministic,
    grounding: {
      total: grounding.total,
      verified: grounding.verified,
      partial: grounding.partial,
      unverified: grounding.unverified,
    },
    review,
    numericMetrics: summarizeNumericMetrics(input.items),
  };

  const config: EvalRunConfig = {
    suiteName: input.suiteName,
    evaluatorName: input.evaluatorName,
    reps: input.reps ?? 1,
    concurrency: input.concurrency ?? 1,
    dimensions: reviewDimensions,
    metrics: [...(input.metrics ?? [])],
    metadata: input.metadata ?? null,
    packageName: input.packageName ?? defaultPackageName,
    packageVersion: input.packageVersion ?? defaultPackageVersion,
  };

  const run: EvalRun<Dimension, OutputType> = {
    runId,
    generatedAt,
    packageName: config.packageName,
    packageVersion: config.packageVersion,
    suiteName: input.suiteName,
    evaluatorName: input.evaluatorName,
    items: input.items,
    config,
    summary,
    report: buildRunReport({
      suiteName: input.suiteName,
      generatedAt,
      summary,
    }),
  };

  return run;
}

export interface LocalJsonExport<Dimension extends string = string, OutputType extends string = string> {
  runConfig: LocalRunConfigExport;
  results: EvalRunSummary;
  report: EvalRunReport;
  items: Array<EvalRunItem<Dimension, OutputType>>;
}

export function exportLocalJson<Dimension extends string = string, OutputType extends string = string>(
  run: EvalRun<Dimension, OutputType>,
): LocalJsonExport<Dimension, OutputType> {
  return {
    runConfig: buildLocalRunConfigExport(run),
    results: run.summary,
    report: run.report,
    items: run.items,
  };
}

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value == null) {
    return '';
  }

  const stringValue = String(value);
  if (!/[,"\n\r]/.test(stringValue)) {
    return stringValue;
  }

  return `"${stringValue.replace(/"/g, '""')}"`;
}

export interface ExportLocalCsvOptions {
  metrics?: readonly string[];
}

export function exportLocalCsv<Dimension extends string = string, OutputType extends string = string>(
  run: EvalRun<Dimension, OutputType>,
  options?: ExportLocalCsvOptions,
): string {
  const metricNames = [...(options?.metrics ?? [])];
  const headers = [
    'caseId',
    'title',
    'status',
    'repetition',
    'outputType',
    'deterministicPass',
    'requiredFactCoverage',
    'requiredFactsMissingCount',
    'forbiddenClaimCount',
    'approvalCorrect',
    'groundingPresent',
    'groundingStatus',
    'reviewStatus',
    'reviewVerdict',
    'reviewIssueCount',
    'durationMs',
    'error',
    ...metricNames,
  ];

  const lines = [headers.join(',')];

  for (const item of run.items) {
    const derivedMetrics = deriveNumericMetrics(item);
    const row = [
      item.caseId,
      item.title ?? '',
      item.status ?? 'completed',
      item.repetition ?? '',
      item.outputType ?? '',
      item.deterministic?.deterministicPass ?? '',
      item.deterministic?.requiredFactCoverage ?? '',
      item.deterministic?.requiredFactsMissing.length ?? '',
      item.deterministic?.forbiddenClaimsPresent.length ?? '',
      item.deterministic?.approvalCorrect ?? '',
      item.deterministic?.groundingPresent ?? '',
      item.grounding?.status ?? '',
      item.review?.status ?? '',
      item.review?.verdict ?? '',
      item.review?.issueCount ?? '',
      item.durationMs ?? '',
      item.error ?? '',
      ...metricNames.map((metric) => derivedMetrics[metric] ?? ''),
    ].map(escapeCsvCell);

    lines.push(row.join(','));
  }

  return `${lines.join('\n')}\n`;
}

export interface WriteRunArtifactsOptions {
  outputDir: string;
  csv?: boolean | ExportLocalCsvOptions;
}

export async function writeRunArtifacts<Dimension extends string = string, OutputType extends string = string>(
  run: EvalRun<Dimension, OutputType>,
  options: WriteRunArtifactsOptions,
): Promise<{
  resultsPath: string;
  reportPath: string;
  runConfigPath: string;
  itemsPath: string;
  csvPath?: string;
}> {
  await mkdir(options.outputDir, { recursive: true });

  const jsonExport = exportLocalJson(run);
  const resultsPath = join(options.outputDir, 'results.json');
  const reportPath = join(options.outputDir, 'report.json');
  const runConfigPath = join(options.outputDir, 'run_config.json');
  const itemsPath = join(options.outputDir, 'items.jsonl');

  await writeFile(resultsPath, `${JSON.stringify(jsonExport.results, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, `${JSON.stringify(jsonExport.report, null, 2)}\n`, 'utf8');
  await writeFile(runConfigPath, `${JSON.stringify(jsonExport.runConfig, null, 2)}\n`, 'utf8');
  const itemsJsonl =
    run.items.length === 0 ? '' : `${run.items.map((item) => JSON.stringify(item)).join('\n')}\n`;
  await writeFile(
    itemsPath,
    itemsJsonl,
    'utf8',
  );

  let csvPath: string | undefined;
  if (options.csv) {
    csvPath = join(options.outputDir, 'items.csv');
    const csvOptions = options.csv === true ? undefined : options.csv;
    await writeFile(csvPath, exportLocalCsv(run, csvOptions), 'utf8');
  }

  return {
    resultsPath,
    reportPath,
    runConfigPath,
    itemsPath,
    ...(csvPath ? { csvPath } : {}),
  };
}
