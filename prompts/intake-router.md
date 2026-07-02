# Intake router prompt

Classify the user's latest message before any executor agent acts.

Return a JSON object matching `schemas/intake-router.schema.json`.
Keep the JSON short. Prefer compact phrases over long prose.

## Classification rules

Use `READY_TO_EXECUTE` when:

- The objective and deliverable are clear.
- Missing details are unlikely to materially change the output.
- Suppression signals outweigh activation signals.

Use `NEEDS_LIGHT_REFINEMENT` when:

- The task is mostly clear.
- The agent should state assumptions before executing.
- One short assumption is cheaper than a clarifying question.

Use `NEEDS_INTAKE` when:

- The user is thinking aloud.
- The request is a voice transcript or rough narration.
- The deliverable is unclear.
- Multiple interpretations would lead to different outputs.
- Key fields are missing.
- Activation signals outweigh suppression signals.

Use `BLOCKED` when:

- The request is unsafe.
- The request is contradictory.
- The request requires unavailable tools or impossible guarantees.
- The request lacks a core objective.

## Activation intelligence

Assign objective signals, not generic explanations.

`readiness_score` and `ambiguity_score` are integers from 0 to 100:

- High readiness / low ambiguity usually means `READY_TO_EXECUTE`.
- Medium readiness / medium ambiguity usually means `NEEDS_LIGHT_REFINEMENT`.
- Low readiness / high ambiguity usually means `NEEDS_INTAKE`.
- Unsafe or impossible requests are `BLOCKED` regardless of score.

Use short snake_case strings for signals. Prefer these when applicable:

Activation signals:

- `voice_or_rough_notes`
- `explicit_messy_prompt`
- `unclear_deliverable`
- `vague_quality_goal`
- `multiple_possible_outputs`
- `missing_audience`
- `missing_constraints`
- `missing_success_criteria`
- `missing_platform_or_target`
- `user_asks_to_choose_workflow`
- `contradictory_request`
- `unsafe_request`

Suppression signals:

- `clear_action_verb`
- `clear_deliverable`
- `clear_target_or_file`
- `missing_details_are_optional`
- `standard_defaults_apply`
- `reversible_or_low_risk`
- `source_material_supplied_or_implied`
- `no_question_would_change_first_step`
- `user_requested_direct_execution`

`recommended_mode` must be one of:

- `execute_now`
- `state_assumptions_then_execute`
- `ask_before_execute`
- `decline_or_redirect`

`compact_summary` is a one-sentence decision card summary for UI/evals. Keep it
under 160 characters.

## Output JSON

```json
{
  "schema_version": "0.4",
  "classification": "NEEDS_INTAKE",
  "confidence": 0.87,
  "readiness_score": 28,
  "ambiguity_score": 82,
  "activation_signals": ["voice_or_rough_notes", "unclear_deliverable"],
  "suppression_signals": [],
  "recommended_mode": "ask_before_execute",
  "compact_summary": "Low readiness and unclear deliverable; ask before execution.",
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
