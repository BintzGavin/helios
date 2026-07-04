#### 1. Context & Goal
- **Objective**: Implement the `helios add` CLI command to fetch and copy components from the registry.
- **Trigger**: The V2 vision mandates a Shadcn-style registry, and the backlog explicitly requests "Implement CLI command to fetch and copy components." Currently, only `studio` exists.
- **Impact**: Enables users to seamlessly adopt and modify core Helios components in their local repositories, unlocking the primary distribution model for V2.

#### 2. File Inventory
- **Create**: `packages/cli/src/commands/add.ts` (Implementation of the `add` command logic)
- **Modify**: `packages/cli/src/index.ts` (Import and register the `add` subcommand with Commander.js)
- **Read-Only**: `AGENTS.md` (To verify architectural constraints for components)

#### 3. Implementation Spec
- **Architecture**: Using Commander.js subcommands, the `add` command will accept a component name, fetch its definition and files from the registry URL, and write the raw source code into the user's project directory (e.g., `src/components/helios`).
- **Pseudo-Code**:
  - Define `add` command with an argument `<componentName>`.
  - Fetch component manifest from the registry API.
  - Read configured destination path (or default to `src/components/helios`).
  - For each file in the manifest, download the source content.
  - Write files to the local file system.
  - Print success message and usage instructions.
- **Public API Changes**: Exports a new `addCommand` setup function for the CLI application.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `node packages/cli/dist/index.js add button` (or equivalent execution of `helios add button`)
- **Success Criteria**: A new file `button.ts` (or `.tsx`) is successfully written to the target local directory, containing the correct registry code.
- **Edge Cases**:
  - Component does not exist in registry (handle 404).
  - Destination file already exists (prompt for overwrite or abort safely).
  - Network failure during fetch.
