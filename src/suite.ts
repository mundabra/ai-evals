import { buildRunArtifact } from './run-artifacts.js';
import { packageName as defaultPackageName, packageVersion as defaultPackageVersion } from './version.js';
import type { EvalCase, EvalRun, EvalRunItem } from './types.js';

interface SuiteWorkItem<TCase extends EvalCase = EvalCase> {
  evalCase: TCase;
  caseIndex: number;
  repetition: number;
  runIndex: number;
}

export type SuiteCaseResult<Dimension extends string = string, OutputType extends string = string> =
  Omit<EvalRunItem<Dimension, OutputType>, 'caseId' | 'title' | 'tags' | 'repetition'> &
    Partial<Pick<EvalRunItem<Dimension, OutputType>, 'caseId' | 'title' | 'tags' | 'repetition'>>;

export interface RunSuiteInput<
  TCase extends EvalCase = EvalCase,
  Dimension extends string = string,
  OutputType extends string = string,
> {
  suiteName: string;
  cases: readonly TCase[];
  evaluateCase: (input: {
    evalCase: TCase;
    caseIndex: number;
    repetition: number;
    runIndex: number;
  }) => Promise<SuiteCaseResult<Dimension, OutputType>> | SuiteCaseResult<Dimension, OutputType>;
  reps?: number;
  concurrency?: number;
  evaluatorName?: string;
  dimensions?: readonly string[];
  metrics?: readonly string[];
  metadata?: Record<string, unknown> | null;
  packageName?: string;
  packageVersion?: string;
}

function normalizeConcurrency(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, Math.floor(value));
}

function createWorkItems<TCase extends EvalCase>(cases: readonly TCase[], reps: number): SuiteWorkItem<TCase>[] {
  const items: SuiteWorkItem<TCase>[] = [];
  let runIndex = 0;

  for (let repetition = 1; repetition <= reps; repetition += 1) {
    cases.forEach((evalCase, caseIndex) => {
      items.push({
        evalCase,
        caseIndex,
        repetition,
        runIndex,
      });
      runIndex += 1;
    });
  }

  return items;
}

async function runWithConcurrency<TCase extends EvalCase, Dimension extends string, OutputType extends string>(
  workItems: SuiteWorkItem<TCase>[],
  concurrency: number,
  evaluateCase: RunSuiteInput<TCase, Dimension, OutputType>['evaluateCase'],
): Promise<Array<EvalRunItem<Dimension, OutputType>>> {
  const results = new Array<EvalRunItem<Dimension, OutputType>>(workItems.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, workItems.length) }, async () => {
    while (nextIndex < workItems.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      const workItem = workItems[currentIndex];
      const startedAt = Date.now();

      try {
        const result = await evaluateCase({
          evalCase: workItem.evalCase,
          caseIndex: workItem.caseIndex,
          repetition: workItem.repetition,
          runIndex: workItem.runIndex,
        });

        results[currentIndex] = {
          caseId: result.caseId ?? workItem.evalCase.id,
          title: result.title ?? workItem.evalCase.title,
          tags: result.tags ?? workItem.evalCase.tags,
          repetition: result.repetition ?? workItem.repetition,
          status: result.status ?? 'completed',
          durationMs: result.durationMs ?? Date.now() - startedAt,
          outputType: result.outputType ?? null,
          deterministic: result.deterministic ?? null,
          grounding: result.grounding ?? null,
          review: result.review ?? null,
          metrics: result.metrics ?? null,
          metadata: result.metadata ?? null,
          error: result.error ?? null,
        };
      } catch (error) {
        results[currentIndex] = {
          caseId: workItem.evalCase.id,
          title: workItem.evalCase.title,
          tags: workItem.evalCase.tags,
          repetition: workItem.repetition,
          status: 'failed',
          durationMs: Date.now() - startedAt,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  });

  await Promise.all(workers);
  return results;
}

export async function runSuite<
  TCase extends EvalCase = EvalCase,
  Dimension extends string = string,
  OutputType extends string = string,
>(
  input: RunSuiteInput<TCase, Dimension, OutputType>,
): Promise<EvalRun<Dimension, OutputType>> {
  const reps = Math.max(1, Math.floor(input.reps ?? 1));
  const concurrency = normalizeConcurrency(input.concurrency);
  const workItems = createWorkItems(input.cases, reps);
  const startedAt = Date.now();
  const items = await runWithConcurrency(workItems, concurrency, input.evaluateCase);
  const durationMs = Date.now() - startedAt;

  return buildRunArtifact({
    suiteName: input.suiteName,
    items,
    evaluatorName: input.evaluatorName,
    reps,
    concurrency,
    dimensions: input.dimensions,
    metrics: input.metrics,
    metadata: input.metadata,
    durationMs,
    packageName: input.packageName ?? defaultPackageName,
    packageVersion: input.packageVersion ?? defaultPackageVersion,
  });
}
