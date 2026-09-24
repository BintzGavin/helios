#### 1. Context & Goal
- **Objective**: Implement the `add` CLI command to fetch and copy components from the registry.
- **Trigger**: AGENTS.md specifies the CLI must support a Shadcn-style component registry, and the backlog explicitly requires a CLI command to fetch and copy components.
- **Impact**: Unlocks the ability for users to install components directly into their local projects, a core requirement of the V2 vision.

#### 2. File Inventory
- **Create**: `packages/cli/src/commands/add.ts` (Command logic for fetching and installing components)
- **Modify**: `packages/cli/src/index.ts` (Register the new `add` command)
- **Read-Only**: `AGENTS.md` (To reference the required Shadcn-style registry architectural pattern)

#### 3. Implementation Spec
- **Architecture**: Use Commander.js to define the `add <component>` subcommand. It will fetch the component manifest from the registry and copy the source files into the user's project repository.
- **Pseudo-Code**:
  - Register `helios add <component>` using Commander.js in `index.ts`.
  - Read local project configuration (`helios.config.json`) to resolve the registry URL.
  - Perform an HTTP GET request to fetch the component manifest.
  - Parse the manifest and write the component source files to the local directory.
- **Public API Changes**: Export a `registerAddCommand` function from `packages/cli/src/commands/add.ts`.
- **Dependencies**: The registry manifest format must be defined and available.

#### 4. Test Plan
- **Verification**: `helios add button`
- **Success Criteria**: The command successfully fetches the `button` component and writes its source files to the local project without errors.
- **Edge Cases**: Component not found in registry, network failures, missing local configuration file.
