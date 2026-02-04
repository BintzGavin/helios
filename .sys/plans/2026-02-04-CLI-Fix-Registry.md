# CLI: Fix Registry Component Implementations

#### 1. Context & Goal
- **Objective**: Update the hardcoded component registry in `packages/cli` to use the correct V2 `Helios` API (Signals) instead of the deprecated `config` object.
- **Trigger**: Discovery that `helios.config` does not exist on the `Helios` class in `packages/core`, causing runtime errors for users of `helios add` (e.g. `helios.config.fps` is undefined).
- **Impact**: Ensures that components added via the CLI actually work, fulfilling the promise of the "Add Command" and unblocking user adoption of the registry.

#### 2. File Inventory
- **Modify**: `packages/cli/src/registry/manifest.ts` (Update component code strings to use `helios.fps.value` and `helios.duration.value`)
- **Read-Only**: `packages/core/src/Helios.ts` (Reference for API)

#### 3. Implementation Spec
- **Architecture**: The `manifest.ts` file contains stringified source code for components. These strings must be updated to reflect the current `Helios` class API which uses Signals.
- **Pseudo-Code**:
  - Open `packages/cli/src/registry/manifest.ts`.
  - Locate `TIMER_CODE` constant.
  - Replace `const fps = heliosInstance.config.fps || 30;` with `const fps = heliosInstance.fps.value || 30;`.
  - Locate `PROGRESS_BAR_CODE` constant.
  - Replace `const duration = heliosInstance.config.duration || 1;` with `const duration = heliosInstance.duration.value || 1;`.
  - Replace `const fps = heliosInstance.config.fps || 30;` with `const fps = heliosInstance.fps.value || 30;`.
- **Public API Changes**: None (internal registry update).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `grep "heliosInstance.config" packages/cli/src/registry/manifest.ts` to ensure no deprecated usage remains.
  - Run `grep "heliosInstance.fps.value" packages/cli/src/registry/manifest.ts` to verify the fix.
- **Success Criteria**:
  - `grep` for `.config.fps` returns no results.
  - `grep` for `.fps.value` returns results in `manifest.ts`.
- **Edge Cases**: Verify that `heliosInstance` is checked for existence before access (existing code already does this).
