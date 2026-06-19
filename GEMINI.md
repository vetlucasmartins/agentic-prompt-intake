# Gemini adapter: Agentic Prompt Intake Protocol

Use `AGENTS.md` as the canonical project instruction file.

When the user input is genuinely vague, voice-transcribed, rambling, or missing a clear deliverable, do not execute blindly — but keep intake cheap.

Cost discipline: run intake in one short pass, with no extended reasoning and no subagents. Default to executing with stated assumptions; use the full brief only for genuinely ambiguous or multi-intent input. Ask 0–3 questions, only when they change the output.

The required fields, classification labels, and the full process live in `AGENTS.md` and `docs/INTAKE-PROTOCOL.md`.
