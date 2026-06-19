# Contributing

Thank you for improving the Agentic Prompt Intake Protocol.

## Contribution rules

1. Keep the protocol platform-portable.
2. Do not make `CLAUDE.md`, Codex, Cursor, or any single platform the only source of truth.
3. Update `docs/INTAKE-PROTOCOL.md` first when changing the core workflow.
4. Update `AGENTS.md` when the agent contract changes.
5. Update skill files when the step-by-step procedure changes.
6. Add or update examples when behavior changes.
7. Run validation before submitting changes.

```bash
python scripts/validate_structure.py
```

## Style

Use clear Markdown. Prefer concise, operational instructions over abstract claims.

## Pull request checklist

- [ ] I updated `docs/INTAKE-PROTOCOL.md` if the protocol changed.
- [ ] I updated `AGENTS.md` if the cross-agent contract changed.
- [ ] I updated relevant platform adapters.
- [ ] I ran `python scripts/validate_structure.py`.
- [ ] I added or updated examples when useful.
