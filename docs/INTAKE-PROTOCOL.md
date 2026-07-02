# Intake Protocol

## 0. Cost discipline (read this first)

Intake is a lightweight routing decision, not a task in itself. It must cost a small fraction of the work it precedes.

- Run intake in ONE short pass. Do not use extended/deep reasoning to classify or refine a prompt.
- Never spawn subagents, read files, or call tools just to produce a brief.
- Bias to the cheapest outcome. Most inputs are `READY_TO_EXECUTE` or `NEEDS_LIGHT_REFINEMENT` — handle them in a few sentences and proceed.
- Reserve the full `NEEDS_INTAKE` brief (sections 5–7 and 12) for genuinely ambiguous or multi-intent input.
- Ask 0–3 questions, only when an answer changes the output. Prefer a stated assumption over a question.
- If you are deliberating at length, the request was probably ready enough — stop and proceed.

Install the protocol in a single scope (global OR project, not both) so it is not loaded twice per session.

## 1. Definition

The Agentic Prompt Intake Protocol is a pre-execution procedure for AI agents. It converts raw human language into a task that can be executed with a reasonable chance of producing the intended result.

It is especially useful when the user communicates through audio, dictation, brainstorming, rough notes, or early-stage project thinking.

The protocol is not merely prompt polishing. It is task formation.

## 2. Mental model

Think of the agent as doing an intake interview before treatment, diagnosis, design, coding, or writing.

A good clinician does not treat a vague symptom description as a complete diagnosis. A good architect does not start construction from a casual sentence. A good agent should not execute a vague prompt as though it were a complete specification.

The protocol creates a transition:

```text
raw narration -> structured understanding -> gap detection -> clarifying questions -> executable brief
```

## 3. Readiness classification

### READY_TO_EXECUTE

Use when the request includes enough information to act without meaningful risk of misalignment.

Example:

```text
Rewrite the following paragraph in formal English, preserving the meaning and reducing repetition.
```

### NEEDS_LIGHT_REFINEMENT

Use when the task is mostly clear but would benefit from a short restatement and explicit assumptions.

Example:

```text
Make this landing page better for parents. Keep it warm and clear.
```

The agent can say:

```markdown
I will assume that "better" means clearer messaging, stronger trust signals,
and a more visible call to action. I will proceed with that direction.
```

Then execute.

### NEEDS_INTAKE

Use when essential information is missing.

Example:

```text
I want to create something from the idea I mentioned in the voice note. Maybe a
product, maybe content. Can you organize it?
```

The agent should ask before executing.

### BLOCKED

Use when the request is unsafe, contradictory, impossible with available tools, or lacks a core objective.

The agent should explain the blockage and offer a safe or feasible alternative.

## 4. Activation intelligence

Activation is not a keyword match. Weigh activation signals against suppression
signals, then choose the cheapest mode that still avoids likely misalignment.

Use two approximate scores when routing through an API or eval harness:

- `readiness_score` (0-100): how ready the request is for execution.
- `ambiguity_score` (0-100): how likely execution is to miss the user's intent.

As a rule of thumb:

- High readiness and low ambiguity -> `READY_TO_EXECUTE`.
- Medium readiness with small optional gaps -> `NEEDS_LIGHT_REFINEMENT`.
- Low readiness or high ambiguity -> `NEEDS_INTAKE`.
- Unsafe, impossible, contradictory, or core-objective-free requests -> `BLOCKED`.

### Activation signals

Signals that push toward intake:

- Voice transcript, rough narration, brainstorming, or thinking aloud.
- The user says the request is messy, unclear, or not yet prompt-shaped.
- No clear deliverable.
- Vague quality goals such as "better", "stronger", or "more professional"
  without a defined dimension of improvement.
- Multiple plausible outputs would lead to different work.
- The task asks the agent to choose a workflow, platform, format, or
  architecture without enough context.
- Missing audience, constraints, success criteria, source material, or platform
  where those fields materially change the output.
- Contradictory, unsafe, impossible, or high-consequence instructions.

### Suppression signals

Signals that suppress intake:

- The request has a clear action verb and object.
- The deliverable is explicit or strongly implied by the task type.
- Missing details are optional polish fields such as tone, length, or examples.
- Reasonable defaults are standard for the requested work.
- A first useful step is obvious and reversible, such as inspecting a file,
  running a test, summarizing supplied text, or applying a small edit.
- Asking a question would not materially change the first output.
- The user explicitly asks for direct execution and the risk is low.

Suppress intake even when small gaps exist if the objective and deliverable are
clear enough and the missing fields would only refine style, not change the
work. In those cases, use `READY_TO_EXECUTE` or `NEEDS_LIGHT_REFINEMENT` with a
visible assumption.

### Compact decision card

When the agent or application needs to show the routing decision, prefer a short
card instead of a full brief:

```markdown
Decision: `NEEDS_LIGHT_REFINEMENT` (readiness 72/100, ambiguity 31/100)
Signals: activation: vague_quality_goal; suppression: clear_deliverable
Questions: 0-1
Next: State assumptions and proceed.
```

For ordinary `READY_TO_EXECUTE` work, omit the card and execute. For
`NEEDS_INTAKE`, use the full brief only when the missing information is critical.

## 5. Trigger indicators

The protocol should trigger when the input contains signals such as:

- "I am thinking out loud..."
- "This prompt is messy..."
- "I will send a voice note..."
- "I am not sure what I need..."
- "Organize this idea..."
- "Turn this into something coherent..."
- Long paragraphs with self-correction and no clear deliverable.
- Multiple possible outputs: article, video script, product strategy, code, research, plan.
- Missing target audience, format, constraints, success criteria, or platform.

## 6. The intake brief

The brief should contain:

| Field | Question |
|---|---|
| Objective | What is the user trying to accomplish? |
| Deliverable | What should be produced? |
| Context | What background matters? |
| Audience | Who is this for? |
| Constraints | What must be respected or avoided? |
| Format | What shape should the output take? |
| Success criteria | What would make the output good? |
| Inputs | What materials are available? |
| Tools/platform | Where will this be used? |

## 7. Gap analysis

Classify missing information as:

### Critical gaps

These block good execution. Examples:

- No deliverable.
- No audience for persuasive or educational work.
- No platform for implementation work.
- No source material for summarization.
- No definition of success for strategy work.

### Useful gaps

These improve quality but do not necessarily block execution. Examples:

- Preferred tone.
- Length.
- Examples of desired style.
- Secondary audience.
- Optional constraints.

## 8. Question strategy

Ask fewer, better questions. Prefer a stated assumption over a question.

Default to 0–3 questions, and only when they change the output:

1. What exact output do you want?
2. Who is it for?
3. What constraints or examples should guide it?

For genuinely complex projects, ask up to five questions, grouped by priority.

Bad question:

```text
Can you provide more details?
```

Better question:

```text
Should the final output be a refined prompt, a project brief, an agent
configuration, or all of those?
```

## 9. Execution threshold

Execute only when at least these fields are clear enough:

- Objective
- Deliverable
- Context
- Constraints

For user-facing writing, also require audience and tone.

For coding or tool configuration, also require platform and file target.

For research, also require scope and source expectations.

## 10. Assumptions

If the agent proceeds with incomplete information, it must state assumptions visibly.

Template:

```markdown
For now, I will assume that:
- ...
- ...

With those assumptions, the executable task is:
> ...
```

## 11. The refined prompt

A refined prompt should include:

```markdown
You are helping with [role/task].
Objective: ...
Context: ...
Deliverable: ...
Audience: ...
Constraints: ...
Success criteria: ...
Steps: ...
Output format: ...
```

Use the user's language. If the user writes in another language, translate the
field labels and questions to that language.

## 12. Anti-patterns

Avoid these behaviors:

- Executing a vague prompt immediately.
- Asking ten generic questions.
- Saying only “please clarify”.
- Rewriting the prompt without identifying missing information.
- Inventing missing requirements.
- Treating the user’s audio transcript as a failure rather than raw material.
- Producing a polished prompt that still lacks task structure.

## 13. Good default response

```markdown
I understand the general direction. Before executing, I will organize the
request to avoid a generic result.

Provisional brief:
- Objective: ...
- Deliverable: ...
- Context: ...
- Audience: ...
- Constraints: ...
- Success criteria: ...

Critical gaps:
1. ...
2. ...

Essential questions:
1. ...
2. ...
3. ...

Provisional refined prompt:
> ...
```

## 14. Platform notes

Use `AGENTS.md` as the cross-tool contract.

Use `SKILL.md` when the platform supports skills or task-specific workflows.

Use repository-specific instruction files when the platform requires them.

Use a JSON router schema when building a custom API or agent system.
