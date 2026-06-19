# Intake Protocol

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
Rewrite the following paragraph in formal Brazilian Portuguese, preserving the meaning and reducing repetition.
```

### NEEDS_LIGHT_REFINEMENT

Use when the task is mostly clear but would benefit from a short restatement and explicit assumptions.

Example:

```text
Make this landing page better for parents. Keep it warm and clear.
```

The agent can say:

```markdown
Vou assumir que “better” significa mais clareza, confiança e conversão. Sigo com essa direção.
```

Then execute.

### NEEDS_INTAKE

Use when essential information is missing.

Example:

```text
Quero criar alguma coisa com essa ideia que te falei no áudio. Talvez um produto ou conteúdo. Organiza isso.
```

The agent should ask before executing.

### BLOCKED

Use when the request is unsafe, contradictory, impossible with available tools, or lacks a core objective.

The agent should explain the blockage and offer a safe or feasible alternative.

## 4. Trigger indicators

The protocol should trigger when the input contains signals such as:

- “Estou pensando alto...”
- “Esse prompt está ruim...”
- “Vou mandar um áudio...”
- “Não sei se é isso...”
- “Organiza essa ideia...”
- “Transforma isso em algo coerente...”
- Long paragraphs with self-correction and no clear deliverable.
- Multiple possible outputs: article, video script, product strategy, code, research, plan.
- Missing target audience, format, constraints, success criteria, or platform.

## 5. The intake brief

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

## 6. Gap analysis

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

## 7. Question strategy

Ask fewer, better questions.

Default to three questions:

1. What exact output do you want?
2. Who is it for?
3. What constraints or examples should guide it?

For complex projects, ask up to seven questions, grouped by priority.

Bad question:

```text
Can you provide more details?
```

Better question:

```text
O resultado final deve ser um prompt refinado, um brief de projeto, uma configuração de agente ou todos esses formatos?
```

## 8. Execution threshold

Execute only when at least these fields are clear enough:

- Objective
- Deliverable
- Context
- Constraints

For user-facing writing, also require audience and tone.

For coding or tool configuration, also require platform and file target.

For research, also require scope and source expectations.

## 9. Assumptions

If the agent proceeds with incomplete information, it must state assumptions visibly.

Template:

```markdown
Vou assumir, por enquanto, que:
- ...
- ...

Com essas suposições, a tarefa executável fica assim:
> ...
```

## 10. The refined prompt

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

In Portuguese:

```markdown
Você está ajudando com [papel/tarefa].
Objetivo: ...
Contexto: ...
Entregável: ...
Público: ...
Restrições: ...
Critério de sucesso: ...
Etapas: ...
Formato de saída: ...
```

## 11. Anti-patterns

Avoid these behaviors:

- Executing a vague prompt immediately.
- Asking ten generic questions.
- Saying only “please clarify”.
- Rewriting the prompt without identifying missing information.
- Inventing missing requirements.
- Treating the user’s audio transcript as a failure rather than raw material.
- Producing a polished prompt that still lacks task structure.

## 12. Good default response

```markdown
Entendi a direção geral. Antes de executar, vou organizar o pedido para evitar um resultado genérico.

Brief provisório:
- Objetivo: ...
- Entregável: ...
- Contexto: ...
- Público: ...
- Restrições: ...
- Critério de sucesso: ...

Lacunas críticas:
1. ...
2. ...

Perguntas essenciais:
1. ...
2. ...
3. ...

Versão provisória do prompt:
> ...
```

## 13. Platform notes

Use `AGENTS.md` as the cross-tool contract.

Use `SKILL.md` when the platform supports skills or task-specific workflows.

Use repository-specific instruction files when the platform requires them.

Use a JSON router schema when building a custom API or agent system.
