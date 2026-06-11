#### 1. Context & Goal
- **Objective**: Improve test coverage for PropsEditor.tsx component.
- **Trigger**: The vitest coverage report indicates low coverage (~50% branch/lines coverage) for PropsEditor.tsx.
- **Impact**: Better testing will prevent regressions when changing PropsEditor.tsx component in the future.

#### 2. File Inventory
- **Create**: packages/studio/src/components/PropsEditor.test.tsx (Update existing file)
- **Modify**: packages/studio/src/components/PropsEditor.test.tsx
- **Read-Only**: packages/studio/src/components/PropsEditor.tsx

#### 3. Implementation Spec
- **Architecture**: Use React Testing Library and vitest to mount the PropsEditor in a simulated context, verifying it correctly displays inputs for primitive schema values and handles updates properly.
- **Pseudo-Code**: Create mock `StudioContext`, then write additional test cases to check all missing branches (e.g. Toolbar Copy/Reset features, unhandled schema cases, drag/drop over state).
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/studio -- src/components/PropsEditor.test.tsx --coverage`.
- **Success Criteria**: Line and branch coverage for `PropsEditor.tsx` improves, ideally reaching 100%.
- **Edge Cases**: Missing schema, nested schema, malformed initial props, drag drop invalid JSON.
