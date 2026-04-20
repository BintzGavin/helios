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
