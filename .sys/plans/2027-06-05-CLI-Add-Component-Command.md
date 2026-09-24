#### 1. Context & Goal
- **Objective**: Implement the `helios add` CLI command to fetch and copy component source code from the registry into user repositories.
- **Trigger**: Backlog item "Implement CLI command to fetch and copy components". The current state only supports `helios studio`.
- **Impact**: Unlocks the Shadcn-style component registry, enabling users to seamlessly integrate and own platform components locally, a key requirement for V2.

#### 2. File Inventory
- **Create**: `packages/cli/src/commands/add.ts`
- **Modify**: `packages/cli/src/index.ts`
- **Read-Only**: `packages/cli/src/commands/studio.ts`

#### 3. Implementation Spec
- **Architecture**: Using Commander.js subcommands, create the `add [component]` command. The implementation will fetch the component manifest/source from the registry URL and write it to the user's project structure.
- **Pseudo-Code**:
  - Define `add` command accepting `<component>` as an argument.
  - In the action handler, fetch the component data from the remote registry.
  - Parse the response and resolve the target local directory.
  - Write the fetched component source files to the local file system.
  - Print a success message confirming the path.
- **Public API Changes**: Add `add` to the CLI's available commands. No changes to other domains.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npx tsx packages/cli/src/index.ts add button` and verify that the corresponding component file is created in the local directory.
- **Success Criteria**: The component source code is successfully downloaded and copied into the correct location without opaque binaries.
- **Edge Cases**:
  - The requested component does not exist in the registry (should fail gracefully).
  - Network timeout or failure.
  - Local file already exists (should prompt or warn before overwriting).
