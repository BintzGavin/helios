1. Context & Goal
- **Objective**: Expand test coverage for HeliosPlayer core class (packages/player/src/index.ts).
- **Trigger**: The PLAYER domain has reached feature equilibrium with the documented vision. The next critical task is to improve stability and test coverage for the core web component, specifically targeting disconnectedCallback and uncovered error paths.
- **Impact**: Improves confidence in the component lifecycle management and memory cleanup.

2. File Inventory
- **Create**: None
- **Modify**: packages/player/src/index.test.ts
- **Read-Only**: packages/player/src/index.ts

3. Implementation Spec
- **Architecture**: Standard Vitest DOM testing.
- **Pseudo-Code**:
  - Add a test block describing disconnectedCallback.
  - Instantiate HeliosPlayer and append it to the DOM.
  - Assert event listeners are attached.
  - Remove it from the DOM (triggering disconnectedCallback).
  - Assert cleanup logic executes.
- **Public API Changes**: None
- **Dependencies**: None

4. Test Plan
- **Verification**: npm run test -w packages/player
- **Success Criteria**: Vitest reports passing tests for disconnectedCallback and overall coverage for index.ts increases.
- **Edge Cases**: Ensure disconnectedCallback does not throw if called before the component is fully initialized.
