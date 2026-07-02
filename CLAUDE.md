# Claude Code adapter: Agentic Prompt Intake Protocol

This repository uses `AGENTS.md` as the cross-tool source of truth. For Claude Code, also follow this file.

## Always apply intake before unclear execution

When the user sends a voice transcript, rambling narration, vague prompt, unclear task, or under-specified project idea, do not execute immediately.

Do not run intake for clear actionable prompts just because small optional
details are missing. Follow the activation/suppression rules in `AGENTS.md` and
the canonical protocol.

Use the skill:

```text
/intake-refiner
```

or follow `.claude/skills/intake-refiner/SKILL.md`.

## Persistent rule

Before execution, verify:

- Objective
- Deliverable
- Context
- Audience
- Constraints
- Format
- Success criteria

If critical fields are missing, ask concise clarifying questions and produce a provisional refined task brief.

When a visible routing explanation is useful, prefer the compact decision card
defined in `docs/INTAKE-PROTOCOL.md` instead of a long brief.

## Repository maintenance

When editing the protocol, update these files together:

- `docs/INTAKE-PROTOCOL.md`
- `AGENTS.md`
- `.agents/skills/intake-refiner/SKILL.md`
- `.claude/skills/intake-refiner/SKILL.md`
- relevant tool adapters

Run:

```bash
python scripts/validate_structure.py
```
