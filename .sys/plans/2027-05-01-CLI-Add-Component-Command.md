#### 1. Context & Goal
- **Objective**: Implement the `helios add` command to fetch and copy components from the registry.
- **Trigger**: The V2 vision requires a Shadcn-style component registry, and the backlog explicitly requests implementing a CLI command to fetch and copy components.
- **Impact**: Unlocks the ability for users to install and own registry components locally in their projects.

#### 2. File Inventory
- **Create**: `packages/cli/src/commands/add.ts` (Implementation of the add command)
- **Modify**: `packages/cli/src/index.ts` (Register the new add command)
- **Read-Only**: `AGENTS.md`

#### 3. Implementation Spec
- **Architecture**: Using Commander.js subcommands, implement an `add <component>` command. It will fetch component data from a remote registry, resolve dependencies, and copy the source files directly into the user codebase.
- **Pseudo-Code**: Define `registerAddCommand(program: Command)`. Fetch registry manifest, find the requested component, download its source files, and write them locally.
- **Public API Changes**: Exports `registerAddCommand`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `node packages/cli/bin/helios.js add button`.
- **Success Criteria**: The `button` component source files are successfully copied into the local directory.
- **Edge Cases**: Handle network errors gracefully, report missing components, and handle existing files without unprompted overwrites.
