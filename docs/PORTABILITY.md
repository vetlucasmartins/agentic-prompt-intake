# Portability guide

This protocol is intentionally multi-platform. The central source of truth is `AGENTS.md`, with adapters for specific tools.

## Compatibility map

| Platform/tool | Primary file(s) | Notes |
|---|---|---|
| Codex | `AGENTS.md`, `.agents/skills/intake-refiner/SKILL.md` | Use `AGENTS.md` for global behavior and the skill for the intake workflow. |
| Claude Code | `CLAUDE.md`, `.claude/skills/intake-refiner/SKILL.md` | `CLAUDE.md` should stay short; the skill contains the procedure. |
| GitHub Copilot | `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md`, `AGENTS.md` | Keep repo-wide instructions concise. |
| Cursor | `.cursor/rules/intake-refiner.mdc`, `AGENTS.md` | Cursor can use project rules and cross-agent instructions. |
| Cline | `.clinerules/intake-refiner.md`, `AGENTS.md` | Cline recognizes multiple rule sources. |
| Windsurf | `.windsurfrules`, `AGENTS.md` | Keep `.windsurfrules` short and direct. |
| Aider | `CONVENTIONS.md`, `.aider.conf.yml`, `AGENTS.md` | Load the files as read-only context. |
| Custom GPT / API agent | `prompts/system-intake.md`, `prompts/intake-router.md`, `schemas/intake-router.schema.json` | Use a router before the main executor. |

## Recommended hierarchy

```text
AGENTS.md                         # cross-agent contract
└── docs/INTAKE-PROTOCOL.md        # canonical detailed protocol
    ├── .agents/skills/...         # Codex / Agent Skills
    ├── .claude/skills/...         # Claude Code skill
    ├── .github/...                # Copilot
    ├── .cursor/...                # Cursor
    ├── .clinerules/...            # Cline
    ├── .windsurfrules             # Windsurf
    └── prompts + schemas          # API / Custom GPT
```

## Maintenance principle

Do not let each platform drift into a different behavioral contract. Keep the core logic identical:

1. Detect unclear input.
2. Restate intent.
3. Build a structured brief.
4. Identify gaps.
5. Ask targeted questions.
6. Produce a refined prompt.
7. Execute only when sufficiently clear.
