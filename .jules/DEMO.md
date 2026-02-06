# Planner's Journal: DEMO

## [1.0.0] - Initialization
**Learning:** Initialized the journal.
**Action:** Always check this file before planning.

## [1.63.0] - Roadmap Discrepancies
**Learning:** The `README.md` Roadmap is outdated; features like SRT Captions (`captions: srt`) and advanced animation helpers (`interpolate`, `spring`) are implemented and functioning in examples (`captions-animation`, `animation-helpers`), despite being marked as "Not yet" or "Planned".
**Action:** When identifying gaps, prioritize verifying feature existence in code (`examples/`) over trusting the `README.md` status.

## [1.63.1] - SolidJS Architecture
**Learning:** SolidJS components run once, making the standard React `Children.map` pattern for `<Series>` impossible. Parity requires a Context-based "Registration" pattern where children register themselves with the parent to receive offsets.
**Action:** When porting React-based helpers to SolidJS, check if the pattern relies on VDOM inspection; if so, refactor to Signal/Context communication.

## [1.64.2] - Client-Side Verification Gap
**Learning:** The "Client-Side Export" feature (WebCodecs) is a "Current Capability" and "Primary Export Path" in the Vision, yet it had zero automated E2E coverage. E2E tests focused entirely on the server-side `Renderer` class.
**Action:** Ensure E2E tests cover not just the `Renderer` pipeline but also the `<helios-player>` features (export, controls, interactivity) by running tests against built client artifacts.

## [1.66.1] - Player Export Gaps
**Learning:** The `@helios-project/player` package does not export `BridgeController` or `DirectController`, making it impossible for users to implement custom integrations or use `ClientSideExporter` programmatically without using the `<helios-player>` Web Component.
**Action:** Created `examples/client-export-api` using source aliases to bypass this, but this gap should be flagged for the PLAYER domain to fix by exporting controllers.

## [1.69.1] - Role Integrity
**Learning:** As a Planner, I must strictly adhere to the "Design Only" protocol. Implementing code (even for verification) violates the agent architecture and boundaries.
**Action:** Stop immediately after saving the `.md` plan file. Do not write implementation code or modify `examples/` directly.

## [1.70.0] - Player E2E ESM Strategy
**Learning:** Testing `<helios-player>` interaction requires a browser environment. Using an Import Map to alias `@helios-project/core` allows testing the ESM bundle directly in a static HTML fixture, avoiding complex test-bundling steps.
**Action:** Use static server + Import Maps for lightweight Web Component E2E fixtures.

## [1.72.1] - Client-Side Verification Parity
**Learning:** The "Primary Export Path" (Client-Side WebCodecs) was only verified by a single static example, while the "Secondary" path (Server-Side) was verified dynamically against all examples. This created a coverage gap where we claimed "Primary" status without comprehensive verification.
**Action:** When a feature is designated as "Primary", ensure its verification pipeline is at least as robust as the secondary/legacy path (e.g., dynamic discovery of all test cases).

## [1.72.2] - Plan Date Inconsistency
**Learning:** The `.sys/plans/` directory contains files with future dates (e.g., 2026), making it difficult to determine the "current" date for new plans.
**Action:** When creating new plans, use the most recent future date found in `.sys/plans/` + 1 day to maintain sorting order, even if the year is incorrect.

## [1.72.3] - Dynamic Verification Pattern
**Learning:** Hardcoded verification scripts (like the original `verify-client-export.ts`) are fragile and incomplete. The "Universal Player Fixture" pattern (using URL params to load compositions) is a powerful way to verify the entire example suite dynamically.
**Action:** Always prefer dynamic discovery and generic fixtures over static, single-case tests for verification.

## [1.74.0] - Vanilla Parity Gap
**Learning:** The "Vanilla JS" examples (`simple-animation`) use legacy inline scripts and relative imports, failing to demonstrate the "Professional" Vite+TS pipeline promised by the Vision.
**Action:** Created `examples/vanilla-typescript` to serve as the canonical reference for non-framework usage.

## [1.76.1] - Vue Animation Helpers Gap
**Learning:** The "Animation Helpers" (interpolate, spring) are core features but were only demonstrated in React examples. Vue and Svelte examples lacked them, creating a parity gap.
**Action:** When verifying framework support, explicitly check that "optional" but core features are demonstrated across ALL supported frameworks, not just the primary one.

## [1.77.0] - SolidJS Animation Sync
**Learning:** SolidJS examples using `createHeliosSignal` may not automatically sync with the document timeline if `autoSyncAnimations` is false. Explicitly calling `helios.bindToDocumentTimeline()` is required for automated playback verification (e.g., Playwright).
**Action:** Always ensure `helios.bindToDocumentTimeline()` is called in framework examples to support consistent automated verification behavior.

## [1.78.1] - Dependency Hoisting
**Learning:** Scripts in the root directory (like `tests/e2e/verify-render.ts`) should explicitly declare their dependencies in the root `package.json`, even if those dependencies are present in workspaces and hoisted. Relying on hoisting works in some environments but fails in others (or linters/reviewers flag it).
**Action:** Always add `devDependencies` to the root `package.json` for any tool used in root-level scripts.

## [1.81.1] - File List Accuracy
**Learning:** Relying on `list_files` output without checking subdirectory contents can lead to incorrect assumptions about file existence (e.g. `main.ts` vs `index.ts`).
**Action:** Always `list_files` in the specific subdirectory before attempting to read files, especially when "guessing" entry points.

## [1.82.0] - SolidJS Build Config Constraint
**Learning:** The `vite.build-example.config.js` file uses a strict regex to include/exclude specific SolidJS example directories (`examples/solid-*`). Adding a new SolidJS example requires manually updating this regex in the root build config, or it will be ignored/miscompiled.
**Action:** When planning new SolidJS examples, always include a step to update `vite.build-example.config.js`.

## [1.83.0] - Plan Scope Discipline
**Learning:** As a Planner, I initially drafted a plan to *implement* the code myself, violating the role boundary. The system rejected this.
**Action:** When creating plans, explicitly verify that every step is about *creating the spec file* or *verifying the spec*, not touching the target code.

## [1.110.0] - React Helios Instantiation
**Learning:** Newer examples or setups might not export a singleton `helios` instance from core. React examples should instantiate `Helios` manually and expose it/use it via context or direct import to ensure proper configuration (like `autoSyncAnimations: false`).
**Action:** Always verify how `Helios` is initialized and accessed in the specific framework context when creating new examples.

## [1.115.0] - Legacy Example Portability
**Learning:** Legacy examples (e.g., `threejs-canvas-animation`) rely on implicit hoisting and root build configs. They lack `package.json` and `tsconfig.json`, making them poor references for users who want to "eject" or copy-paste.
**Action:** Standardize legacy examples by adding `package.json` and TypeScript configuration to ensure they are self-contained and "Professional".

## [1.127.0] - Scaffolding vs Standardization
**Learning:** Examples may be marked as "Completed" (Scaffolded) but lack the standardization (TypeScript, package.json) required by the vision. Scaffolding is just step one.
**Action:** When auditing "Completed" examples, verify they meet the *current* standard (TS, private package), not just that they exist.
