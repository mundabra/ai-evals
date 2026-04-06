# Disclaimer

`@mundabra/ai-evals` is a practical library for measuring AI output quality signals such as citation grounding, deterministic fact coverage, and structured draft review.

It is **not**:

- a guarantee of truth
- a safety system
- a compliance program
- a legal or policy reviewer
- a replacement for human judgment in high-risk workflows

Deterministic scoring can only assess the checks you encode. Model-backed review can fail, drift, or disagree with human reviewers. Both should be treated as inputs into a broader quality process, not as final authority.

If you use this package in production:

- keep human review for sensitive or externally regulated output
- validate downstream business rules separately
- test your own eval cases regularly
- document how you interpret scores and verdicts

Use of this package is at your own risk.
