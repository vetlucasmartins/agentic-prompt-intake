# Agentic Prompt Intake Protocol

The canonical English README is [README.md](README.md).

This file is kept for compatibility with older links and package references.

Current behavior is documented in the canonical README. In `v0.4.0`, the router
adds activation intelligence: readiness and ambiguity scores, objective
activation/suppression signals, a recommended mode, and a compact decision
summary. The goal remains the same: keep intake cheap, suppress it for clear
prompts, and reserve full clarification for genuinely ambiguous requests.

The `v0.5` work is a calibration and release-readiness phase. It adds quality
gates and optional Markdown eval reports without expanding the one-pass
protocol. See [docs/QUALITY-GATES.md](docs/QUALITY-GATES.md).
