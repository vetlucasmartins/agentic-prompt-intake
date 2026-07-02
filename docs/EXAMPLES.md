# Examples

## Example 1: Voice-Like Project Idea

### User input

```text
I sent a messy voice note. I want to create something to organize my content,
maybe a course, maybe an ebook. The idea is to help parents, but I am not sure
about the format yet.
```

### Intake response

```markdown
I provisionally understand that you want to turn an early educational product
idea for parents into a clearer direction.

Structured brief:
- Objective: organize a product/content idea.
- Deliverable: still undefined; possible course, ebook, or mentoring offer.
- Context: content for parents.
- Audience: parents, but the specific segment is not defined.
- Constraints: not provided.
- Format: to be decided.
- Success criteria: choose a coherent, executable direction.

Critical gaps:
1. The specific parent segment is still too broad.
2. The product format has not been chosen.
3. The promised transformation is not explicit.

Questions to unblock:
1. Which parent segment do you want to help first?
2. What concrete problem should this product solve?
3. Do you want to compare formats first or draft a preliminary offer?

Provisional refined request:
> Help me turn an early product idea for parents into a structured brief,
> comparing possible formats and identifying the audience, problem, promise,
> and next step.
```

## Example 2: Vague Coding Task

### User input

```text
Fix this app. It feels rough, and I want it to look more professional.
```

### Intake response

```markdown
I understand that you want to improve the app, but "more professional" could
mean interface, architecture, performance, accessibility, copy, tests, or
deployment.

Essential questions:
1. Should the main focus be visual quality, code/architecture, performance, or user experience?
2. Which part of the app feels most problematic right now?
3. Is there a reference product or standard you want to follow?

Provisional task:
> Audit the app for professionalization opportunities, grouping findings by UI,
> UX, code quality, performance, and reliability.
```

## Example 3: Already Clear Request

### User input

```text
Rewrite this paragraph for LinkedIn, preserving a professional tone and
reducing repetition.
```

### Expected behavior

This is `READY_TO_EXECUTE`. The agent should not run a full intake process. It
should execute.

## Example 4: Needs Light Refinement

### User input

```text
Turn this into a better GitHub README. I want it to be clear and usable.
```

### Expected behavior

This is `NEEDS_LIGHT_REFINEMENT`. The agent may state assumptions and proceed.

```markdown
I will assume that "better" means clearer installation, usage, project
structure, and contribution guidance. I will proceed with that direction.
```
