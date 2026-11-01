#### 1. Context & Goal
- **Objective**: Implement the `helios add` command to fetch and copy components from the registry.
- **Trigger**: Backlog item explicitly requests "Implement CLI command to fetch and copy components" to bridge the gap in V2 Vision for a Shadcn-style component registry.
- **Impact**: Unlocks the ability for users to consume shared registry components directly into their own repositories, forming the foundation of the component economy.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/commands/add.ts` (Command logic for fetching and writing components)
- **Modify**:
  - `packages/cli/src/index.ts` (Register the new `add` command)
- **Read-Only**:
  - `AGENTS.md` (To understand Shadcn-style registry requirements and constraints)

#### 3. Implementation Spec
- **Architecture**: Using Commander.js subcommands, fetch component source from the registry URL, and copy it into the user's local workspace.
- **Pseudo-Code**:
  ```typescript
  export const registerAddCommand = (program) => {
    program.command('add <component>')
      .description('Fetch and copy a component from the registry')
      .action(async (component) => {
        // Fetch component source code from the remote registry endpoint
        // Determine the target local path for the new component
        // Write the fetched source code to the target path
        // Print success message
      });
  };
  ```
- **Public API Changes**: Adds `helios add [component]` to the CLI interface and exports `registerAddCommand` from the new file.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npx tsx src/index.ts add button` in a test project directory.
- **Success Criteria**: The component source file is successfully downloaded, created in the expected local directory, and a success message is printed to the console.
- **Edge Cases**: Handle network failures gracefully during fetch, gracefully exit if component is not found in registry, and prompt or avoid overwriting if the local file already exists.