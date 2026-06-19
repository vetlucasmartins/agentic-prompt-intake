#!/usr/bin/env python3
"""Validate the expected repository structure for Agentic Prompt Intake Protocol."""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = [
    "README.md",
    "AGENTS.md",
    "CLAUDE.md",
    "CONVENTIONS.md",
    ".agents/skills/intake-refiner/SKILL.md",
    ".claude/skills/intake-refiner/SKILL.md",
    ".github/copilot-instructions.md",
    ".github/instructions/intake-refiner.instructions.md",
    ".cursor/rules/intake-refiner.mdc",
    ".clinerules/intake-refiner.md",
    ".windsurfrules",
    "docs/INTAKE-PROTOCOL.md",
    "docs/PORTABILITY.md",
    "docs/EXAMPLES.md",
    "prompts/system-intake.md",
    "prompts/intake-router.md",
    "schemas/intake-router.schema.json",
    "templates/intake-brief.md",
    "templates/execution-prompt.md",
    "evals/intake-cases.jsonl",
]

REQUIRED_SKILL_FIELDS = ["name: intake-refiner", "description:"]


def main() -> int:
    missing = [path for path in REQUIRED_FILES if not (ROOT / path).exists()]
    if missing:
        print("Missing required files:")
        for path in missing:
            print(f"- {path}")
        return 1

    for skill_path in [
        ROOT / ".agents/skills/intake-refiner/SKILL.md",
        ROOT / ".claude/skills/intake-refiner/SKILL.md",
    ]:
        text = skill_path.read_text(encoding="utf-8")
        for field in REQUIRED_SKILL_FIELDS:
            if field not in text:
                print(f"Missing {field!r} in {skill_path}")
                return 1

    protocol = (ROOT / "docs/INTAKE-PROTOCOL.md").read_text(encoding="utf-8")
    for term in ["READY_TO_EXECUTE", "NEEDS_LIGHT_REFINEMENT", "NEEDS_INTAKE", "BLOCKED"]:
        if term not in protocol:
            print(f"Missing classification {term} in docs/INTAKE-PROTOCOL.md")
            return 1

    print("Repository structure OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
