#### 1. Context & Goal

- **Objective**: Improve test coverage for the `AssetItem` and `AssetsPanel` components in the `packages/studio/src/components/AssetsPanel` directory.
- **Trigger**: The current coverage report shows that `AssetsPanel.tsx` has 58.24% line coverage (uncovered lines include 202-220, 231, 253) and `AssetItem.tsx` has 71.28% line coverage (uncovered lines include 79, 209, 245-251). The act() warnings in `AssetItem.test.tsx` have been addressed, but more tests are needed for full coverage.
- **Impact**: Increased confidence in the asset management UI logic, specifically around deleting and renaming different asset types and handling various state edge cases.

#### 2. File Inventory

- **Create**:
  - `packages/studio/src/components/AssetsPanel/AssetsPanel.test.tsx` (Update to cover lines 202-220, 231, 253)
  - `packages/studio/src/components/AssetsPanel/AssetItem.test.tsx` (Update to cover lines 79, 209, 245-251)
- **Modify**: None
- **Read-Only**:
  - `packages/studio/src/components/AssetsPanel/AssetItem.tsx`
  - `packages/studio/src/components/AssetsPanel/AssetsPanel.tsx`

#### 3. Implementation Spec

- **Architecture**: Standard Vitest and React Testing Library setup for component testing. Use `act` and `fireEvent` to simulate user interactions and verify state changes.
- **Pseudo-Code**:
  1. Add tests in `AssetItem.test.tsx` to handle specific edge cases (e.g. unhandled asset types, missing properties, error paths during rename).
  2. Add tests in `AssetsPanel.test.tsx` for edge cases during drag-and-drop or asset filtering.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan

- **Verification**: Run `cd packages/studio && npx vitest run src/components/AssetsPanel --coverage`
- **Success Criteria**: Line and branch coverage for `AssetItem.tsx` and `AssetsPanel.tsx` reaches 100%, and all tests pass without `act()` warnings.
- **Edge Cases**: Unhandled asset types, API failures during rename or delete operations, empty states.
