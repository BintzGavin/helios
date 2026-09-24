#### 1. Context & Goal
- **Objective**: Implement the `helios add [component]` command to fetch and copy components from the registry.
- **Trigger**: Vision gap identified in AGENTS.md and backlog item "Implement CLI command to fetch and copy components".
- **Impact**: Enables users to seamlessly integrate Shadcn-style components directly into their source repositories, forming the foundation of the component registry vision.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/commands/add.ts` (Implements the add command using Commander.js)
  - `packages/cli/src/commands/__tests__/add.test.ts` (Unit tests for the add command)
- **Modify**:
  - `packages/cli/src/index.ts` (Register the new add command)
- **Read-Only**: None

#### 3. Implementation Spec
- **Architecture**: Create a Commander.js subcommand `add <component>` that takes a component name. It should resolve the registry URL, fetch the component source, and copy it into the user's local components directory.
- **Pseudo-Code**:
  - Define `registerAddCommand(program)`
  - Register `add <component>` command
  - Action handler: `async (component) => { ... }`
  - Fetch registry URL for the component
  - Parse response and extract source files
  - Write source files to the local project structure
- **Public API Changes**: Export `registerAddCommand` from `add.ts`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/cli src/commands/__tests__/add.test.ts`
- **Success Criteria**: Tests pass, verifying that the command correctly fetches a mock component and writes the expected files to a virtual/tmp directory.
- **Edge Cases**: Network failures during fetch, missing component, missing write permissions.
