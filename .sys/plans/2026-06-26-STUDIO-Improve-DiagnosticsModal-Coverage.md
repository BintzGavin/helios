#### 1. Context & Goal
- **Objective**: Improve test coverage for the `DiagnosticsModal` component to 100% by resolving `act()` warnings and adding coverage for missing branches.
- **Trigger**: Quality goal to improve coverage for components in Helios Studio and satisfy the previous plan regarding `AudioMixerPanel` and `DiagnosticsModal` coverage.
- **Impact**: Removes noisy test warnings, ensures tests reflect actual browser behavior and properly reach full test coverage metrics for edge cases such as false client capabilities and missing error messages on server diagnostic failure.

#### 2. File Inventory
- **Modify**: `packages/studio/src/components/DiagnosticsModal.test.tsx`
  - Ensure state updates triggered on render via side effects (`Helios.diagnose` and `fetch`) are correctly wrapped using `await act(async () => { renderWithContext(true); })`
  - Remove synchronous assertions for "loading state" when wrapped in `await act` which resolves after loading states complete.
  - Add test for rendering false properties which output `✗` marks.
  - Add test for `!res.ok` fallback error message `Failed to fetch server diagnostics`.

#### 3. Implementation Spec
- **Architecture**: Apply React 18 testing patterns (`act()`) and add missing test assertions for edge cases based on `DiagnosticsModal.tsx` branching logic.
- **Pseudo-Code**:
  - Replace `renderWithContext(isOpen)` with `await act(async () => renderWithContext(isOpen))` across all tests.
  - Address structural changes needed to support `await act` (e.g. converting `it` callbacks to `async` where required).
  - Add test: "renders cross icons for false diagnostic values" targeting line 15 `value ? ... : <span className="status-icon status-cross">✗</span>` by providing mock diagnostic payload where `.webCodecs = false`.
  - Add test: "displays fallback error when server diagnostics fail without data.error" targeting line 42 `throw new Error(data.error || 'Failed to fetch server diagnostics');` by providing a fetch response that has `ok: false` but empty JSON payload `{}`.

#### 4. Test Plan
- **Verification**: `cd packages/studio && npx vitest run src/components/DiagnosticsModal.test.tsx --coverage`
- **Success Criteria**:
  - 100% Statements, Branches, Functions, and Lines for `DiagnosticsModal.tsx`.
  - No `act()` warnings output to stderr during test execution.
