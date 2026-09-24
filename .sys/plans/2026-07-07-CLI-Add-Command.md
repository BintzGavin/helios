#### 1. Context & Goal
- **Objective**: Implement the `helios add` CLI command to fetch and copy Shadcn-style components from the registry into user repositories.
- **Trigger**: Documented vision gap in AGENTS.md (CLI is missing registry commands) and explicit backlog item to "Implement CLI command to fetch and copy components".
- **Impact**: Unlocks the component registry for Helios V2, allowing developers to consume distributed source-level components and enabling the platform's component economy.

#### 2. File Inventory
- **Create**: `packages/cli/src/commands/add.ts` (Implements the `add` command logic to fetch and copy files)
- **Modify**: `packages/cli/src/index.ts` (Registers the new `add` command with Commander.js)
- **Read-Only**: `packages/cli/src/commands/studio.ts` (Reference for existing Commander.js registration patterns)

#### 3. Implementation Spec
- **Architecture**: Define a Commander.js subcommand for `add <component>`. The command will perform an HTTP request to the Helios component registry, fetch the specified component's code, and write the raw source files into the user's project directory to ensure the user owns the code.
- **Pseudo-Code**:
  - Register `add <component>` command
  - Provide description 'Add a component from the registry'
  - On action execution:
    - Validate component name argument
    - Fetch registry index to find the component
    - Fetch component source file content
    - Ensure local destination directory exists
    - Write component code to local file system
    - Output success message
- **Public API Changes**: Exports a new `addCommand` function for CLI registration. Exposes `helios add [component]` to end users.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run build -w packages/cli` and then test locally by executing `node packages/cli/dist/index.js add button`.
- **Success Criteria**: The CLI correctly fetches the `button` component code from the mock/real registry and creates the physical source file in the local repository structure.
- **Edge Cases**: Registry network failure, component not found in registry, local file already exists (prevent accidental overwrite without a force flag).
