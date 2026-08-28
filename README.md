<div align="center">

# 🧠 Agentic Prompt Intake Protocol

**A portable specification and intake layer for AI agents. Clarifies voice transcripts, messy notes, and vague prompts before executing code.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![npm version](https://img.shields.io/badge/npm-v0.4.0-red.svg)](https://npmjs.com/package/agentic-prompt-intake)
[![GitHub Stars](https://img.shields.io/github/stars/lucasmartins-ai/agentic-prompt-intake?style=social)](https://github.com/lucasmartins-ai/agentic-prompt-intake)
[![Agent Protocol](https://img.shields.io/badge/Agents.md-Compatible-purple.svg)](AGENTS.md)

</div>

---

## 📌 Why This Exists

Modern AI agents (Claude Code, OpenAI Codex, Cursor, Antigravity) are exceptionally good at execution, but they often **execute too early**. 

When a user dictates an idea, thinks out loud, changes direction mid-sentence, or asks for *"something better"* without specifying deliverables, most agents treat that raw input as a finalized specification—wasting tokens and writing the wrong code.

**Agentic Prompt Intake** adds an intelligent, portable triage layer before execution:

```text
raw user input / voice note
             │
             ▼
      [Intake Router]  ──► Classifies: READY_TO_EXECUTE | NEEDS_LIGHT_REFINEMENT | NEEDS_INTAKE | BLOCKED
             │
             ▼
      [Intake Refiner] ──► Clarifies missing scope & requirements (only when useful)
             │
             ▼
      [Main Executor]  ──► Receives structured task brief instead of an ambiguous guess
```

---

## 📦 Installation & Setup

### 1-Click Installer

From any project directory:

```bash
# Run via npx
npx agentic-prompt-intake

# Or install from GitHub directly
npx github:lucasmartins-ai/agentic-prompt-intake
```

For automated scripts or CI/CD:
```bash
npx agentic-prompt-intake --target claude,cursor --scope project --yes
```

The installer detects your active AI tools, copies the appropriate skill/rule files, and injects an idempotent marked block into contract files (`CLAUDE.md`, `AGENTS.md`, or `.cursorrules`).

---

## 🛠️ Supported AI Agent Ecosystems

| Tool | Installed Files | Notes |
| :--- | :--- | :--- |
| **Claude Code** | `CLAUDE.md`, `.claude/skills/intake-refiner/SKILL.md` | Persistent skill layout and adapter. |
| **Codex / Agent Skills** | `AGENTS.md`, `.agents/skills/intake-refiner/SKILL.md` | Canonical cross-agent specification contract. |
| **Google Antigravity** | `AGENTS.md`, `.agents/skills/intake-refiner/SKILL.md` | AGY agent skill layout. |
| **Cursor** | `.cursor/rules/intake-refiner.mdc` | Project rule with active context trigger. |
| **GitHub Copilot** | `.github/copilot-instructions.md` | Concise repository instructions. |
| **Cline / Windsurf** | `.clinerules`, `.windsurfrules` | Workspace rules and intake boundaries. |

---

## 🚦 How the Router Decides

The protocol uses four objective triage classifications:

- `READY_TO_EXECUTE`: The request is complete, concrete, and unambiguous. Proceeds directly.
- `NEEDS_LIGHT_REFINEMENT`: Minor details are missing; the agent states explicit assumptions and proceeds without stalling.
- `NEEDS_INTAKE`: Essential parameters are missing; the agent asks 1-3 targeted multiple-choice questions before executing.
- `BLOCKED`: The request violates safety policy, rate limits, or project boundaries.

---

## 🧪 Testing & Validation

Run the zero-dependency eval runner to verify classification behavior across 50+ test cases:

```bash
node scripts/validate_rules.js
node test/run_evals.js
```

---

## ⭐ Star & Support
- ⭐ **Star this repository** if you care about building disciplined AI agents!
- 💡 **Contribute adapters** for new coding agents and IDEs.

---

## Built by LookADev

[`agentic-prompt-intake`](https://github.com/lucasmartins-ai/agentic-prompt-intake) is built and maintained by [LookADev](https://lookadev.com).

**Start a project → [lookadev.com](https://lookadev.com)** · **Email: [lucas@lookadev.com](mailto:lucas@lookadev.com)**

## 📄 License

Open-source software licensed under the [MIT License](LICENSE).
