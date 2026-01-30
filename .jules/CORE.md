## [2026-04-26] - Vision Alignment Gaps
**Learning:** Vision gaps can be subtle API misalignments, not just missing features. The vision "Video is Light Over Time" implies a time-based API (`currentTime`), but the reality was frame-based (`currentFrame`).
**Action:** When auditing, check if the *DX* aligns with the vision, not just the feature checklist.

## [2.8.0] - Recursive Schema Plan
**Learning:** Plans in `.sys/plans` can be stale or unexecuted. I found `2026-01-29-CORE-Recursive-Schema.md` which addressed a critical gap but wasn't implemented in the code.
**Action:** When identifying gaps, cross-reference `.sys/plans` with `src` code. If a plan exists but isn't implemented, re-issue the plan (regenerate) to trigger execution, rather than assuming it's done or ignoring it.

## [2.10.0] - Plan Specificity
**Learning:** When using `set_plan` or `request_plan_review` to create a spec file, the plan step must explicitly contain the full text content of the file to be created, rather than just a description of what it will contain.
**Action:** Always include the full Markdown content in the plan step description when the task is to create a specific file.

## [2.13.0] - Missing Asset Types
**Learning:** Found that `packages/studio` supports `model`, `json`, `shader` asset types, but `packages/core` schema validation rejected them.
**Action:** When defining schemas in Core, always cross-reference with Studio's supported asset discovery types to ensure compatibility.

## [2.15.0] - AI Diagnostics Gap
**Learning:** The "AI Integration Parity" vision requires robust environment diagnostics (`webgl`, `codecs`), but `Helios.diagnose()` was minimal.
**Action:** When auditing for AI parity, check `Helios.diagnose()` completeness against modern browser capabilities (WebCodecs, WebGL, WebAudio) to ensure agents can self-debug effectively.

## [2.16.0] - Typed Arrays Gap
**Learning:** The vision emphasizes "Performance When It Matters" (WebGL/WebCodecs), but `PropType` lacked support for Typed Arrays (`Float32Array`, etc.), forcing users to use generic `object` types and bypassing validation.
**Action:** When implementing high-performance features, ensure the Schema system explicitly supports the necessary data structures (like Typed Arrays) to maintain type safety without sacrificing raw access.

## [2.16.0] - Planner Role Clarity
**Learning:** The Planner Agent's `set_plan` steps must be "Create the spec file" and "Verify the spec file", NOT "Implement the code". The plan content goes *inside* the spec file.
**Action:** Ensure `set_plan` steps focus on the *meta-task* of planning (creating documentation), not the execution of the plan itself.

## [2.17.0] - Leaky Signal Subscriptions
**Learning:** The implementation of `Signal.subscribe` using `effect` caused a leaky abstraction where the subscription implicitly tracked dependencies accessed within the callback.
**Action:** When implementing reactive primitives, ensure that explicit subscriptions (like `subscribe`) execute their callbacks in an untracked context to prevent accidental dependency collection.
