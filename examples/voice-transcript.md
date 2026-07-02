# Example: Voice Transcript

## Raw input

```text
I am thinking about something that would make AI understand me better when I
send a voice note. I talk loosely, and the agent usually starts doing random
things too early. I want it to ask first, organize the idea, find what is
missing, maybe as a skill or AGENTS.md file. I am not sure.
```

## Expected output

```markdown
I understand that you want an intake layer for voice notes or poorly framed
prompts, so the AI does not execute too early.

Structured brief:
- Objective: improve agent responses to vague inputs.
- Deliverable: reusable protocol/configuration for agents.
- Context: voice notes, natural prompts, and multiple platforms.
- Audience: users who prefer to speak naturally.
- Constraints: must be portable across tools.
- Format: likely AGENTS.md plus skills/adapters.
- Success criteria: the agent asks before acting when critical gaps exist.

Questions to unblock:
1. Which first platform should this support: Codex, Claude Code, or another?
2. Should the agent always ask, or may it proceed with assumptions when risk is low?
3. Should the final result be instructions only or a public repository?
```
