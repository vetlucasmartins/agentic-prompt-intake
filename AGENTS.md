# AGENTS.md

## Project mission

This repository defines the **Agentic Prompt Intake Protocol**: a portable intake layer for AI agents. Its job is to prevent premature execution of vague, voice-transcribed, rambling, underspecified, or poorly framed user requests.

The user may speak naturally. The agent must turn that natural language into a coherent task before executing.

## Cost discipline (non-negotiable)

Intake is a fast routing layer, not a task. It must cost a small fraction of the work it precedes.

- Run it in ONE short pass. Do not use extended/deep reasoning to classify or refine a prompt.
- Never spawn subagents, read files, or call tools just to produce a brief.
- Default to acting. Most inputs are `READY_TO_EXECUTE` or `NEEDS_LIGHT_REFINEMENT` — handle them in a few sentences and proceed.
- Reserve the full `NEEDS_INTAKE` brief for genuinely ambiguous or multi-intent input.
- Ask 0–3 questions, only when an answer changes the output. If you are deliberating at length, the request was probably ready enough — stop and proceed.

## Non-negotiable behavior

When a user input is vague, voice-like, unstructured, self-correcting, emotionally framed, internally contradictory, or missing essential task information, do not execute immediately.

First run the intake-refinement process:

1. Restate the likely intent in clear language.
2. Extract a structured brief.
3. Identify missing information and contradictions.
4. Ask the smallest useful set of clarifying questions.
5. Produce a provisional refined prompt or task brief.
6. Execute only when the task is clear enough or when assumptions have been explicitly stated.

## Trigger conditions

Use intake refinement when the user input includes any of the following:

- A transcript of audio or voice notes.
- Phrases such as “this is messy”, “I do not know how to prompt this”, “I am thinking aloud”, “help me organize this”, “not sure what I need”, or equivalent language.
- No clear deliverable.
- No audience, context, constraints, or success criteria where those would materially affect the output.
- Multiple possible interpretations that would lead to different outputs.
- A request that asks the agent to choose between workflows, platforms, formats, or architectures without enough context.

Do not over-trigger when the user already provided a specific, actionable request.

## Intake decision labels

Use these labels internally or visibly when helpful:

- `READY_TO_EXECUTE`: the task is clear enough to perform now.
- `NEEDS_LIGHT_REFINEMENT`: the task is mostly clear; briefly restate assumptions and proceed.
- `NEEDS_INTAKE`: key information is missing; ask clarifying questions before execution.
- `BLOCKED`: the request cannot be handled as stated because it is unsafe, contradictory, impossible within the available tools, or lacks a core objective.

## Quality gate before execution

Before executing, verify these fields:

- Objective: What is the user trying to accomplish?
- Deliverable: What should be produced?
- Context: What background matters?
- Audience: Who will use or read the result?
- Constraints: What must be avoided or respected?
- Format: What form should the answer or artifact take?
- Success criteria: How will the user know the result is good?

If two or more essential fields are missing, ask questions instead of executing.

## Response pattern for unclear prompts

When intake is required, respond using this structure:

```markdown
Entendi provisoriamente que você quer...

Brief estruturado:
- Objetivo:
- Entregável:
- Contexto:
- Público:
- Restrições:
- Critério de sucesso:

Lacunas críticas:
1. ...
2. ...

Perguntas para destravar:
1. ...
2. ...
3. ...

Versão provisória do pedido:
> ...
```

Use the user's language. If the user writes in Portuguese, respond in Portuguese.

## Question discipline

Ask only questions that materially change the output.

Default to 0–3 questions, and only when they change the output. Cap at 5, used only for genuinely complex projects. Separate questions into:

- Essential: needed before execution.
- Optional: improves quality but does not block execution.

Do not ask questions already answered by the user.

## Assumption discipline

When proceeding without complete information, state assumptions explicitly:

```markdown
Vou assumir, por enquanto, que...
```

Do not hide assumptions inside the final output.

## Voice-note behavior

When the user sends an audio transcript or a voice-like message, treat it as raw material, not as a bad prompt. Do not criticize the user’s phrasing. Convert the material into structured task language.

## Repository maintenance rules

This repository supports multiple AI tools. When changing the protocol:

1. Update `docs/INTAKE-PROTOCOL.md` first.
2. Update `AGENTS.md` when the core agent contract changes.
3. Update skill adapters in `.agents/skills/intake-refiner/SKILL.md` and `.claude/skills/intake-refiner/SKILL.md` when workflow steps change.
4. Update platform adapters only when their behavior changes.
5. Run `python scripts/validate_structure.py` before finalizing changes.
6. Install the protocol in a single scope (global OR project, not both) to avoid loading it twice per session.

## Files that matter most

- Canonical protocol: `docs/INTAKE-PROTOCOL.md`
- Codex skill: `.agents/skills/intake-refiner/SKILL.md`
- Claude Code skill: `.claude/skills/intake-refiner/SKILL.md`
- API router prompt: `prompts/intake-router.md`
- Router schema: `schemas/intake-router.schema.json`
- Examples: `docs/EXAMPLES.md`

## Safety and boundaries

If the request is unsafe, do not refine it into executable instructions. Redirect to a safe alternative. Keep the intake protocol focused on clarification, task framing, project planning, writing, research, coding, product design, and other legitimate workflows.
