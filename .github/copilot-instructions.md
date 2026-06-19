# GitHub Copilot repository instructions

This repository implements the Agentic Prompt Intake Protocol.

When working in this repository, treat `AGENTS.md` and `docs/INTAKE-PROTOCOL.md` as the source of truth.

## Behavioral rule

When a user request is genuinely vague, voice-transcribed, rambling, or missing essential task information, do not execute blindly — but keep intake cheap.

Cost discipline: run intake in one short pass, with no extended reasoning and no subagents. Default to executing with stated assumptions; use the full brief only for genuinely ambiguous or multi-intent input. Ask 0–3 questions, only when they change the output. The required fields and classification labels live in `AGENTS.md` and `docs/INTAKE-PROTOCOL.md`.

## Maintenance rule

When editing the protocol, update these files consistently:

- `docs/INTAKE-PROTOCOL.md`
- `AGENTS.md`
- `.agents/skills/intake-refiner/SKILL.md`
- `.claude/skills/intake-refiner/SKILL.md`
- platform-specific adapters as needed

Run `python scripts/validate_structure.py` after structural changes.
