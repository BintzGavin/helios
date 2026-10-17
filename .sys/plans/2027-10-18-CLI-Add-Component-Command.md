#### 1. Context & Goal
- **Objective**: Implement the `helios add` CLI command to fetch and copy components from the registry.
- **Trigger**: The prompt explicitly states in 'Backlog Items' to 'Implement CLI command to fetch and copy components'.
- **Impact**: This unlocks the Shadcn-style component registry feature outlined in the V2 vision, allowing users to consume and own components locally.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/commands/add.ts`: The main command implementation for `helios add`.
  - `packages/cli/src/commands/__tests__/add.test.ts`: Unit tests for the add command.
- **Modify**:
  - `packages/cli/src/index.ts`: Register the new `add` command.
- **Read-Only**:
  - `packages/cli/src/mcp/client.ts` (or relevant registry client): To reuse or understand how to fetch from the registry.

#### 3. Implementation Spec
- **Architecture**: Using Commander.js, create an `add <component>` command. It will use a registry client to fetch the component source and write it to the user's local components directory.
- **Pseudo-Code**:
  - Define command `add [components...]` with options for `--yes` (skip prompts) and `--overwrite`.
  - Fetch component metadata from registry.
  - For each component, resolve dependencies.
  - Prompt user for confirmation if not `--yes`.
  - Fetch component source files.
  - Write files to `components/` directory (or configured path).
  - Update `helios.config.json` or `components.json` to track installed components.
- **Public API Changes**: Exports a new Commander `addCommand`.
- **Dependencies**: Depends on the existence of a registry endpoint or client.

#### 4. Test Plan
- **Verification**: `npx tsx packages/cli/src/index.ts add test-component`
- **Success Criteria**: The component files are successfully written to the local disk, and the CLI outputs a success message.
- **Edge Cases**:
  - Component not found in registry.
  - Component already exists locally (prompt to overwrite).
  - Network failure during fetch.
