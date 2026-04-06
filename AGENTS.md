# Mundabra AI Evals

Shared instructions for coding agents working in this repository.

## Project Summary

`@mundabra/ai-evals` is a small TypeScript package for grounded AI evals.

It provides:

- source registry and citation verification primitives
- grounding metadata and summary helpers
- deterministic scoring for fact coverage, forbidden claims, grounding presence, and approval checks
- optional AI SDK-backed draft review under the `./ai-sdk` export

## Stack

- TypeScript
- ESM-only package output
- Node.js `>=20`
- `pnpm`
- `vitest`
- `zod`
- optional peers: `ai`, `@ai-sdk/provider`

## Commands

- Install: `pnpm install`
- Check everything: `pnpm check`
- Test: `pnpm test`
- Typecheck: `pnpm typecheck`
- Build: `pnpm build`
- Pack smoke: `pnpm pack:smoke`

Run `pnpm check` before finishing behavior-changing work.

## Key Files

- `src/index.ts`: public root exports
- `src/ai-sdk.ts`: optional AI SDK review entrypoint
- `src/source-registry.ts`: source capture and citation matching
- `src/grounding.ts`: grounding metadata and fixture scoring
- `src/deterministic.ts`: deterministic benchmark scorer
- `src/metrics.ts`: rollup helpers
- `tests/*.test.ts`: contract and regression coverage

## Important Invariants

- Keep the public API small and stable.
- Do not introduce imports from app frameworks or product-specific runtimes.
- Citation fallback matching must fail closed when label/source matches are ambiguous.
- URL normalization must strip fragments, trailing slashes, and common tracking params.
- Deterministic scoring must remain string-based and portable.
- The `./ai-sdk` export must remain optional and isolated from the root surface.
- Docs must match real behavior, especially defaults, skipped checks, and limitations.

## Change Policy

- Add or update tests for every behavior change.
- If you change public behavior, update `README.md` and `docs/eval-reference.md`.
- Prefer focused diffs over broad refactors.
- Do not expand the root API casually.

## Public Open Source Positioning

This repository should be easy for both humans and agents to inspect quickly.

When adding new documentation, prefer:

- short markdown files with explicit headings
- concrete commands
- stable file paths
- clear statements of defaults, non-goals, and invariants

## Related Docs

- `LICENSE`: code license
- `DISCLAIMER.md`: usage and risk disclaimer
- `CONTRIBUTING.md`: contributor workflow
- `SECURITY.md`: disclosure path and security scope
- `docs/agent-guide.md`: architecture and invariants
