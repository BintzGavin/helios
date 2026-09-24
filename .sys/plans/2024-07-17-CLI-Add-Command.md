#### 1. Context & Goal
- **Objective**: Implement the `helios add` command to fetch and copy components from the registry.
- **Trigger**: Backlog item "Implement CLI command to fetch and copy components" and vision gap where only `studio.ts` exists.
- **Impact**: Unlocks component registry consumption for V2 users.

#### 2. File Inventory
- **Create**: `packages/cli/src/commands/add.ts` (Implement the command logic)
- **Modify**: `packages/cli/src/index.ts` (Register the new command)
- **Read-Only**: `packages/cli/src/commands/studio.ts` (To copy the command registration pattern)

#### 3. Implementation Spec
- **Architecture**: Using Commander.js subcommands, create `add [component]` which takes a component name, fetches its code from the registry, and writes it to the user's local components directory.
- **Pseudo-Code**:
  - Define `add` command with `<component>` argument.
  - Fetch component definition from registry URL.
  - Resolve destination path based on `helios.config.json` (or default to `./src/components`).
  - Write file contents to disk.
  - Log success message.
- **Public API Changes**: Export `registerAddCommand(program: Command)` from `add.ts`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run build -w packages/cli` and execute `node packages/cli/bin/helios.js add button`.
- **Success Criteria**: The button component source code should be created in the local file system.
- **Edge Cases**: Missing component name, component not found in registry, destination directory does not exist.
