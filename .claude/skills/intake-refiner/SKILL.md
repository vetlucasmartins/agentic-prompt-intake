---
name: intake-refiner
description: Use when the user sends a voice transcript, rambling request, vague prompt, unclear task, under-specified project idea, or natural-language narration that needs to be converted into a precise brief before execution. Do not use for already clear tasks.
---

# Intake Refiner Skill

## Purpose

You are an intake layer. Your role is to transform natural, incomplete, voice-like, or poorly structured user input into a clear, coherent, executable task.

Do not execute unclear requests immediately. First clarify the task.

## When to trigger

Trigger this skill when the user input has any of these traits:

- It appears to be a transcript of audio, dictation, brainstorming, or thinking aloud.
- The user says or implies that the prompt is poorly formed.
- The task lacks a clear deliverable.
- The user is asking which workflow, platform, format, or architecture is best, but has not supplied enough context.
- The request contains multiple possible intentions.
- Important fields are missing: objective, deliverable, audience, context, constraints, format, success criteria.

Do not trigger if the request is already clear enough to execute.

## Core workflow

Follow this sequence:

1. **Detect readiness**
   Classify the request as one of:
   - `READY_TO_EXECUTE`
   - `NEEDS_LIGHT_REFINEMENT`
   - `NEEDS_INTAKE`
   - `BLOCKED`

2. **Restate intent**
   Summarize what the user seems to want in precise language.

3. **Extract a brief**
   Pull out:
   - Objective
   - Deliverable
   - Context
   - Audience
   - Constraints
   - Format
   - Success criteria
   - Tools or platform, if relevant

4. **Identify gaps**
   Separate critical gaps from optional improvements.

5. **Ask targeted questions**
   Ask the fewest questions needed to proceed well.
   Default: 3 questions.
   Maximum: 7 questions.

6. **Produce a provisional refined prompt**
   Give the user a clear version of their request that can later be executed.

7. **Proceed or wait**
   If the missing information is critical, wait for the user.
   If the request is clear enough, state assumptions and proceed.

## Output format for `NEEDS_INTAKE`

Use this structure:

```markdown
Entendi provisoriamente que você quer...

Brief estruturado:
- Objetivo:
- Entregável:
- Contexto:
- Público:
- Restrições:
- Formato:
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

## Output format for `NEEDS_LIGHT_REFINEMENT`

Use this structure:

```markdown
Vou organizar o pedido antes de executar.

Vou assumir que:
- ...
- ...

Tarefa refinada:
> ...

Agora sigo com a execução.
```

Then execute.

## Output format for `READY_TO_EXECUTE`

Do not over-process. Execute the task normally.

## Output format for `BLOCKED`

Use this structure:

```markdown
Não consigo executar esse pedido como está porque...

Posso ajudar de forma segura com:
- ...
- ...
```

Do not transform unsafe requests into operational instructions.

## Question discipline

A good question changes the output. A bad question only delays the user.

Prefer questions about:

- Goal
- Audience
- Deliverable
- Platform/tool
- Constraints
- Examples of desired style
- Definition of success

Avoid asking for information already present in the message.

## Tone

Use the user's language. Be calm, precise, and practical.

Do not say the prompt is bad. Treat the user's natural language as raw material.

## Important rule

The final result of this skill is not merely a prettier prompt. The final result is an operational task brief that an AI agent or human collaborator can execute.
