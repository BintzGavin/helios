#### 1. Context & Goal
- **Objective**: Improve test coverage for `StudioContext.tsx` by writing tests for uncovered functions (`openInEditor` and `useStudio` error).
- **Trigger**: Coverage report shows missing test coverage for `openInEditor` and `useStudio` in `StudioContext.tsx`.
- **Impact**: Attain ~100% test coverage for the context, ensuring Editor Integration functionality behaves as expected and catching missing provider edge cases.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/studio/src/context/StudioContext.test.tsx`
- **Read-Only**: `packages/studio/src/context/StudioContext.tsx`

#### 3. Implementation Spec
- **Architecture**: Vitest with `@testing-library/react`
- **Pseudo-Code**:
  - Add test for `useStudio` hook where it throws an error if used outside a `StudioProvider` component. (Using `renderHook` and checking for the thrown error).
  - Add test to call `openInEditor` via a mock component inside the context provider.
  - Mock global `fetch` specifically for `/__open-in-editor`.
  - Trigger `openInEditor` and expect fetch to be called with the appropriate encoded URL path.
  - Also simulate fetch error rejection within `openInEditor` to cover the `.catch()` line.
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/studio src/context/StudioContext.test.tsx -- --coverage`
- **Success Criteria**: Coverage report shows 100% lines/branches/statements covered for `StudioContext.tsx` with lines 944-946 and 1020 successfully tested.
- **Edge Cases**:
  - `openInEditor` strips `/@fs` prefix from paths before encoding.
  - Using hook without context provider cleanly throws predefined error.
