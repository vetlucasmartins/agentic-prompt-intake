# GitHub Copilot repository instructions

This repository implements the Agentic Prompt Intake Protocol.

When working in this repository, treat `AGENTS.md` and `docs/INTAKE-PROTOCOL.md` as the source of truth.

## Behavioral rule

When a user request is vague, voice-transcribed, rambling, incomplete, or missing essential task information, do not execute immediately. First convert the request into a structured brief.

Check for:

- Objective
- Deliverable
- Context
- Audience
- Constraints
- Format
- Success criteria

If two or more essential fields are missing, ask clarifying questions before execution.

## Maintenance rule

When editing the protocol, update these files consistently:

- `docs/INTAKE-PROTOCOL.md`
- `AGENTS.md`
- `.agents/skills/intake-refiner/SKILL.md`
- `.claude/skills/intake-refiner/SKILL.md`
- platform-specific adapters as needed

Run `python scripts/validate_structure.py` after structural changes.
