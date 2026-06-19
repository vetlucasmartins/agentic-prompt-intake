# Changelog

## 0.2.0 - One-command installer

- Added zero-dependency `npx agentic-prompt-intake` installer (`bin/cli.js`).
- Interactive flow: auto-detects the tool and asks for project vs global scope.
- Non-interactive flags: `--target`, `--scope`, `--yes`, `--list`, `--help`.
- Safely injects an idempotent marked block into existing `CLAUDE.md`/`AGENTS.md` instead of overwriting them.
- Added the animated terminal demo (`docs/demo.gif`) and `docs/DEMO.md`.
- Added "Context and motivation" section and English README parity.

## 0.1.0 - Initial public draft

- Added cross-agent `AGENTS.md` contract.
- Added Codex / Agent Skills skill at `.agents/skills/intake-refiner/SKILL.md`.
- Added Claude Code skill and `CLAUDE.md` adapter.
- Added adapters for GitHub Copilot, Cursor, Cline, Windsurf, Aider, and generic API agents.
- Added intake router schema and prompts.
- Added examples and validation script.
