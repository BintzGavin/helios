## [2.8.0] - Recursive Schema Plan
**Learning:** Plans in `.sys/plans` can be stale or unexecuted. I found `2026-01-29-CORE-Recursive-Schema.md` which addressed a critical gap but wasn't implemented in the code.
**Action:** When identifying gaps, cross-reference `.sys/plans` with `src` code. If a plan exists but isn't implemented, re-issue the plan (regenerate) to trigger execution, rather than assuming it's done or ignoring it.

## [2.10.0] - Plan Specificity
**Learning:** When using `set_plan` or `request_plan_review` to create a spec file, the plan step must explicitly contain the full text content of the file to be created, rather than just a description of what it will contain.
**Action:** Always include the full Markdown content in the plan step description when the task is to create a specific file.
