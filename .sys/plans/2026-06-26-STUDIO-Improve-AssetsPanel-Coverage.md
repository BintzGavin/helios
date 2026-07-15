#### 1. Context & Goal
- **Objective**: Improve the test coverage for \`AssetsPanel.tsx\` to 100%.
- **Trigger**: The test coverage report shows that \`AssetsPanel.tsx\` and \`AssetItem.tsx\` have missing branch and lines coverage, specifically around drag-and-drop file external upload events and file input edge cases.
- **Impact**: Increased test reliability and prevents regressions in asset drag-and-drop flows.

#### 2. File Inventory
- **Create**: None
- **Modify**: \`packages/studio/src/components/AssetsPanel/AssetsPanel.test.tsx\` (Add unit tests for file drops and input selections)
- **Read-Only**: \`packages/studio/src/components/AssetsPanel/AssetsPanel.tsx\`

#### 3. Implementation Spec
- **Architecture**: N/A - Unit test additions.
- **Pseudo-Code**:
  - Mock file objects and a \`drop\` event with \`dataTransfer.files\` pointing to the mocks.
  - Assert that \`mockUseStudio.uploadAsset\` is called for each mocked file.
  - Trigger a \`change\` event on the hidden file input with mocked files and assert uploads.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: \`npm run test -w packages/studio -- --coverage\`
- **Success Criteria**: 100% test coverage for \`AssetsPanel.tsx\` and \`AssetItem.tsx\`.
- **Edge Cases**: Dropping on child components, external non-Heilos drop events, empty files list.
