# Intake router prompt

Classify the user's latest message before any executor agent acts.

Return a JSON object matching `schemas/intake-router.schema.json`.

## Classification rules

Use `READY_TO_EXECUTE` when:

- The objective and deliverable are clear.
- Missing details are unlikely to materially change the output.

Use `NEEDS_LIGHT_REFINEMENT` when:

- The task is mostly clear.
- The agent should state assumptions before executing.

Use `NEEDS_INTAKE` when:

- The user is thinking aloud.
- The request is a voice transcript or rough narration.
- The deliverable is unclear.
- Multiple interpretations would lead to different outputs.
- Key fields are missing.

Use `BLOCKED` when:

- The request is unsafe.
- The request is contradictory.
- The request requires unavailable tools or impossible guarantees.
- The request lacks a core objective.

## Output JSON

```json
{
  "classification": "NEEDS_INTAKE",
  "confidence": 0.87,
  "reason": "The user supplied a voice-like request and has not specified a deliverable.",
  "known_fields": {
    "objective": "...",
    "deliverable": null,
    "context": "...",
    "audience": null,
    "constraints": [],
    "format": null,
    "success_criteria": null
  },
  "critical_gaps": ["deliverable", "audience"],
  "suggested_questions": [
    "What output should be produced?",
    "Who is the audience?",
    "Where will this be used?"
  ],
  "provisional_task": "..."
}
```
