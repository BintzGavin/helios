## [v0.76.10] - Strict Role Adherence
**Learning:** I mistakenly implemented feature code (modifying `audio-utils.ts`) instead of strictly creating a spec file as required by the "Planner" role. This violates the protocol.
**Action:** When assigned the "Planner" role, I must ONLY produce Markdown files in `/.sys/plans/` and NEVER modify source code in `packages/`.
## v0.76.12 - Enforcing Blocked Protocol
**Learning:** If there are no uncompleted implementation plans explicitly listed for my domain in `/.sys/plans/`, I must strictly adhere to the 'EXECUTOR'S PHILOSOPHY' and STOP. Attempting to artificially fulfill context file regeneration steps when there is no new code to write violates the boundary protocol and introduces unmaintainable clutter.
**Action:** Before writing any code or updating documentation, always verify that a valid, uncompleted plan exists. If none exists, immediately update the status and backlog files to indicate a blocked state and ask for the next plan.
## v0.76.12 - Context File Preservation
**Learning:** Even if no new implementation code is written (e.g., when blocked), I must NEVER delete the `/.sys/llmdocs/context-player.md` file. Deleting it destroys the shared context that other agents rely on.
**Action:** Always preserve the context file. Only modify it to reflect actual changes to the codebase.
## v0.76.13 - Regression Fallback
**Learning:** The PLAYER domain has reached gravitational equilibrium with the documented vision. No missing features exist from the README.
**Action:** When no feature deltas exist, always fall back to improving test coverage and documentation stability instead of creating unwarranted logic changes.
## v0.77.0 - Documentation Synchronization
**Learning:** During the implementation of the media session properties, I learned that strict adherence to the protocol requires not only modifying the source files (`src/index.ts`) but also updating the corresponding tracking and context files (`docs/status/PLAYER.md`, `docs/PROGRESS.md`, `.sys/llmdocs/context-player.md`) in the repository. Modifying compiled build artifacts (`dist/`) directly is incorrect and will cause issues.
**Action:** Always ensure that modifications are made only to source files, and follow the protocol to update status and documentation files before finalizing a commit.
## [v0.77.1] - Add Missing Plan
**Learning:** The previous plan was missing from `/.sys/plans/`, violating the protocol.
**Action:** Always create a plan file when instructed as Planner.
## [v0.77.10] - Identifying minor API Parity Gaps
**Learning:** During review of API parity tests, `srcObject` only returns null and warns on assignment. While `srcObject` stream rendering isn't supported, assigning the property should persist the value to match standard `HTMLMediaElement` wrapper expectations.
**Action:** When creating plans for API Parity, ensure getters and setters interact coherently with internal state even if the underlying functionality is deferred or partially supported.
## [v0.77.12] - Bridge Coverage Limitations
**Learning:** Attempting to force missing parameter boundaries onto the `bridge.ts` message listener improves branch coverage, but highlights that the true source of validation should be on the core `Helios` controller side. Testing these defensive checks in `bridge.test.ts` brings the file to 100% coverage, satisfying the objective.
**Action:** Write tests for the boundaries anyway to achieve the 100% coverage goal.
## v0.77.15 - Strict Execution of Plans
**Learning:** Even if a feature like srcObject persistence has been previously completed according to the status file, I must strictly identify the *next uncompleted plan* for my domain and implement it, or create a new plan for an unaddressed vision gap. In this case,  parity was already completed in , so creating another plan for it was incorrect.
**Action:** Always check  for completed versions to avoid creating duplicate plans. If the latest plan is completed, look for new gaps in the vision.
## [v0.77.20] - Frame-based Keydown Alignments
**Learning:** The implementation of keyboard shortcuts like `ArrowLeft` and `ArrowRight` was originally seeking by seconds, but the `README.md` explicitly promised frame-based seeking.
**Action:** When planning, double-check that the fine-grained implementation details match the high-level documentation in `README.md`.
## [v0.77.25] - Addressing Environment Issues in Tests
**Learning:** `packages/player/src/export-options.test.ts` was failing because the `vitest` environment defaults to Node, making `document` unavailable. The `HeliosPlayer` Web Component uses `document` at the module level.
**Action:** Created plan to ensure the `@vitest-environment jsdom` pragma is added to files testing DOM components.

## [v0.77.25] - Missing README properties
**Learning:** Properties implemented in `index.ts` (e.g., `mediaTitle`) are sometimes missing from the `README.md` properties list due to disconnected implementation and documentation steps.
**Action:** When adding new properties, explicitly include updating the README in the implementation spec, or periodically cross-reference `index.ts` exported properties with the README.
## v0.76.20 - Template Compliance
**Learning:** Missing one of the required bullet points in the implementation spec template can cause validation failure.
**Action:** When planning, make sure to include all required sections from the template (Context & Goal, File Inventory, Implementation Spec, Test Plan) and their respective sub-bullets.

## 0.77.29 - IMPOSSIBLE DUPLICATION Plan
**Learning:** Found a plan `2026-03-01-PLAYER-Click-To-Play.md` that requested implementing a `.click-layer` with `pointer-events: none` and click events. However, this feature was already completely implemented in the source code.
**Action:** When picking up plans, strictly verify their requested changes against the current state of the codebase. Do not blindly overwrite or duplicate existing features if they are already present. If found to be a duplication, document it as impossible and close it.
## v0.77.30 - Updating README for missing properties and events
**Learning:** Properties like `audioTracks` and `videoTracks`, and events like `enterpictureinpicture` and `leavepictureinpicture` were implemented but missed in the documentation. `setPlaybackRange` and `clearPlaybackRange` exist on the `HeliosController` and not the Web Component directly.
**Action:** Created a plan to document the missing properties and events on the Web Component, ensuring exact matches between the API capabilities and documentation.
## v0.77.31 - Accurate Verification of Documented API
**Learning:** During planning to update `README.md` for undocumented API members (`audioTracks`, `videoTracks`, `setPlaybackRange`, etc.), I found that some of these were actually either already documented or they belonged to the controller interface rather than the public web component API.
**Action:** Always carefully check the target documentation file (`README.md`) using strict grep patterns to ensure the gap actually exists, and verify if the member belongs to the public API or internal interfaces before adding it to the plan.
## v0.77.32 - Undocumented Seeking Events
**Learning:** Found that `seeking` and `seeked` events are being dispatched by the player but were not documented in the README.md events list.
**Action:** Created a plan to document the missing events to maintain API parity visibility.

## [v0.77.40] - Undocumented Events
**Learning:** The `error` and `audiometering` events were being fired by `<helios-player>` but were missing from the `README.md` events list.
**Action:** Created a plan to document these missing events to maintain strict API parity visibility.
## [v0.77.41] - Documenting Event Handlers
**Learning**: The standard event handler properties (`onplay`, `onpause`, etc.) were implemented for API parity but never explicitly documented in the README, leading to a vision gap.
**Action**: Always verify that newly implemented API surfaces are immediately documented in the project's README to maintain synchronization between implementation and vision.
## [v0.77.44] - Add Missing Plan Content
**Learning:** When using `cat << 'EOF'` to create a file in an execution plan, the complete, explicit text/markdown content must be provided within the command. Using placeholders like `...` violates the Specificity Rule.
**Action:** Always write out the full file content inside the `cat << 'EOF'` command when drafting a plan.

## [v0.77.44] - Avoid Unverified Test Assumptions
**Learning:** The script `packages/renderer/tests/verify-orchestrator-plan.ts` is strictly for verifying performance experiment plans (`PERF-*.md`) and is not applicable to Frontend Planner specs (`PLAYER-*.md`). Furthermore, the Planner role explicitly forbids running tests.
**Action:** Do not include steps to run tests (e.g., `npm test` or `verify-orchestrator-plan.ts`) in the execution plan when acting as the Planner.

## [v0.77.44] - Missing onaudiometering Event Handler Property
**Learning:** The `audiometering` event was dispatched and documented, but the corresponding IDL attribute (event handler property `onaudiometering`) was missing from the `<helios-player>` implementation, creating an API parity gap with standard HTMLMediaElement patterns.
**Action:** Created an implementation spec to add the `onaudiometering` getter and setter to complete standard media API parity.

## [v0.77.46] - Duplicate Implementation Plan
**Learning:** Sometimes plans are generated for features that are already fully implemented in the code.
**Action:** Always verify code and README first, mark as 'IMPOSSIBLE: DUPLICATION', and discard the plan if the feature exists.
## [v0.77.49] - Document Missing Event Handlers
**Learning:** Found an undocumented event handler properties gap (playing, waiting, suspend, stalled) between the `index.ts` implementation and `README.md`.
**Action:** Generated plan to document them in `README.md` ensuring complete API parity matching `index.ts`. Always compare actual getter/setter implementations to README properties lists.

## [v0.77.49] - Undocumented Events Dispatched
**Learning:** Found that some events mentioned in the README (`suspend`, `stalled`, `waiting`) are exposed as handler properties (e.g. `onsuspend`) but are never actually dispatched by the player implementation, creating an API parity gap.
**Action:** Generated plan to implement the missing event dispatches in `src/index.ts` to match standard `HTMLMediaElement` lifecycles and ensure complete API parity.

## [v0.77.52] - Document Event Handlers
**Learning:** Implemented missing media event handlers (onabort, onemptied, onprogress) to improve API parity with HTMLMediaElement and updated documentation.
**Action:** Generated plan to implement missing event dispatches for abort, emptied, progress and updated README.md to ensure complete API parity matching index.ts.

## [v0.77.57] - Duplicate Implementation Plan
**Learning:** Sometimes plans are generated for features that are already fully implemented in the code.
**Action:** Always verify code and README first, mark as 'IMPOSSIBLE: DUPLICATION', and discard the plan if the feature exists.
## [v0.77.58] - Document Missing Media Events
**Learning:** Implemented event dispatches were missing from the Events list in README.md despite event handlers being documented.
**Action:** Ensure both the event and its handler are documented when adding new events.
