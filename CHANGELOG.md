# Changelog

## 0.3.0 - Cost discipline / lightweight intake

- Added a "cost discipline" guardrail to the skill, system prompt, `AGENTS.md`, and `docs/INTAKE-PROTOCOL.md`: intake runs in one short pass — no extended reasoning, no subagents, no file reads — so it never costs more than the task it precedes.
- Inverted the default posture toward `READY_TO_EXECUTE` / `NEEDS_LIGHT_REFINEMENT`; the full `NEEDS_INTAKE` brief is reserved for genuinely ambiguous or multi-intent input. Question budget lowered to 0–3 (hard cap 5).
- Tightened the skill trigger `description` so it no longer fires on already-actionable prompts.
- De-duplicated the Gemini, Cursor, Windsurf, and Copilot adapters: inline field lists replaced with pointers to the canonical files; documented installing in a single scope to avoid double-loading.
- Strengthened evals with cost-guard fields (`max_questions`, no extended reasoning/subagents) and added ready-prompt cases.
- Added an eval **runner** (`scripts/run_eval.mjs`, zero-dependency, native `https`, Node ≥ 16): one model call per case (no tools, `temperature 0`, bounded `max_tokens`), provider-agnostic (Anthropic default, OpenAI adapter). Scores classification, question budget, `must_not_do`, `must_ask_about`, stated assumptions, and records input/output **tokens** against a per-class **cost ceiling**, printing a PASS/FAIL table plus a summary (accuracy, avg/p95 cost). Added `npm run eval` and `npm run eval:dry` (schema + static asserts, no network — CI-friendly).
- README/README.en: documented the single-scope install warning (avoid double-loading the protocol), the v0.3.0 cost discipline, and how to run the eval. The installer (`bin/cli.js`) now emits a non-blocking warning when the protocol is already present in the other scope (global vs project).
- Added installer targets for **Google Antigravity** (reads `AGENTS.md` + the `.agents/` directory, same standard as Codex) and **Zed** (injects a marked block into Zed's default `.rules` file, never overwriting it). Added the repo's own `.rules` and refreshed the README platform list/tree to the modern tool set (Antigravity, Cursor, Windsurf, Zed, …) while keeping the Gemini CLI adapter.

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
