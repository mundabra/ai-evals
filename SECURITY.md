# Security Policy

## Scope

`@mundabra/ai-evals` is a lightweight evals library. It helps measure grounding and conformance signals, but it is not a complete security boundary and not a safety system.

See [DISCLAIMER.md](./DISCLAIMER.md) for the broader usage and risk disclaimer.

Do not rely on this package alone for:

- hallucination prevention
- authorization
- moderation
- sandboxing
- compliance review
- legal review
- prompt confidentiality guarantees

## Reporting

If you believe you found a security issue, please avoid opening a public issue with exploit details.

Report privately to:

- `mundabra@gmail.com`

Include:

- affected version or commit
- reproduction steps
- impact assessment
- any suggested mitigation

## Supported Hardening Expectations

Behavior that should remain covered:

- citation matching fails closed when fallback matches are ambiguous
- URL normalization removes common tracking and fragment noise
- deterministic scoring does not silently change without tests
- the root package stays free of framework and app-runtime dependencies
- the optional `./ai-sdk` surface stays isolated from the deterministic core
- documentation accurately states defaults, skipped checks, and limitations

## Disclosure

I will aim to acknowledge reports promptly and coordinate a fix before public disclosure when reasonable.
