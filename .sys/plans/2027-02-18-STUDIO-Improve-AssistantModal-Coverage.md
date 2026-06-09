#### 1. Context & Goal
- **Objective**: Improve unit test coverage for the AssistantModal component to reach at least 90%.
- **Trigger**: "Nothing to Do Protocol" applies as all major vision features are implemented; test coverage analysis shows AssistantModal has low coverage (36%).
- **Impact**: Ensures the Ask AI feature, prompt generation logic, and documentation search functionality are robust and prevent future regressions.

#### 2. File Inventory
- **Create**: []
- **Modify**: [`packages/studio/src/components/AssistantModal/AssistantModal.test.tsx` - Add tests for generatePrompt, doc toggle, and UI interactions]
- **Read-Only**: [`packages/studio/src/components/AssistantModal/AssistantModal.tsx`]

#### 3. Implementation Spec
- **Architecture**: Use Vitest and React Testing Library to simulate user interactions like typing queries, generating prompts, searching documentation, and toggling doc sections.
- **Pseudo-Code**:
  - Test `generatePrompt`: Simulate user typing a query and clicking "Generate Prompt", verify output matches expected prompt template.
  - Test `toggleDoc`: Simulate clicking on a doc header, verify content expands/collapses.
  - Test `docSearch`: Simulate typing in doc search input, verify filtered docs list.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: `npm run test -w packages/studio`
- **Success Criteria**: Vitest reports AssistantModal test coverage > 90% for statements and branches.
- **Edge Cases**: Empty queries, no matching docs, empty schemas.
