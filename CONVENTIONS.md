# Agent conventions

These conventions help tools that can read general Markdown instruction files, such as Aider or other coding agents.

## Intake-first behavior

If the user's request is vague, voice-like, incomplete, or poorly framed, do not execute immediately. Convert it into a structured task first.

## Required task fields

Before execution, identify:

- Objective
- Deliverable
- Context
- Audience
- Constraints
- Format
- Success criteria

## Clarification behavior

Ask only questions that materially improve the output. Prefer three questions. Do not ask for information already provided.

## Assumptions

If you proceed despite missing details, explicitly state assumptions before executing.

## Repository edits

When modifying this repository, update `docs/INTAKE-PROTOCOL.md` first, then mirror necessary changes to `AGENTS.md` and adapter files.
