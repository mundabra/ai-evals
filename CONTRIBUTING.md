# Contributing

Thanks for contributing to `@mundabra/ai-evals`.

This repository is intentionally small. Changes should stay focused, test-backed, and easy to review.

## Start Here

- Read [README.md](./README.md) for the package overview.
- Read [AGENTS.md](./AGENTS.md) for repository invariants and working rules.
- Read [docs/agent-guide.md](./docs/agent-guide.md) if you are changing public behavior or library structure.
- Read [DISCLAIMER.md](./DISCLAIMER.md) and [SECURITY.md](./SECURITY.md) before changing public positioning or risk claims.

## Development

Requirements:

- Node.js `>=20`
- `pnpm`

Install dependencies:

```bash
pnpm install
```

Run the full local verification suite:

```bash
pnpm check
```

Individual commands:

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm pack:smoke
```

## Contribution Rules

- Keep diffs narrow and intentional.
- Add or update tests for behavior changes.
- Update docs when defaults, limitations, or public contracts change.
- Preserve the package's low-dependency design.
- Do not add product-specific abstractions to the public API.

## High-Risk Areas

Take extra care when modifying:

- `src/source-registry.ts`
- `src/grounding.ts`
- `src/deterministic.ts`
- `src/ai-sdk.ts`
- `src/index.ts`

These files define behavior that downstream consumers will rely on directly.

## Before Opening a PR

- Run `pnpm check`
- Re-read changed README examples for accuracy
- Confirm package exports and docs still align
- Confirm deterministic scoring examples still reflect actual behavior

## Notes For AI Coding Agents

- Start with `AGENTS.md`
- Prefer regression tests for public contract changes
- Use package-name imports in tests instead of internal source paths
- Prefer updating an existing doc instead of creating overlapping docs
