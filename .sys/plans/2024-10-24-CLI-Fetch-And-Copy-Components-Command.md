#### 1. Context & Goal
- **Objective**: Implement the `helios add` command to fetch and copy components from the registry.
- **Trigger**: The V2 vision mandates a Shadcn-style component registry where components are copied into user repositories, closing the vision gap identified in AGENTS.md.
- **Impact**: Unlocks the ability for users to fetch and modify component code locally as part of the distributed rendering ecosystem.

#### 2. File Inventory
- **Create**: `packages/cli/src/commands/add.ts` (Implement the `add` command logic)
- **Modify**: `packages/cli/src/index.ts` (Register the new `add` command)
- **Read-Only**: `packages/cli/src/commands/studio.ts` (Reference for Commander.js setup pattern)

#### 3. Implementation Spec
- **Architecture**: Using Commander.js subcommands, fetch from the registry URL, and copy the component source files into the user repository.
- **Pseudo-Code**:
  - Register the `add` command in `index.ts`.
  - Accept `[component]` as an argument in `add.ts`.
  - Fetch the component definition from the registry.
  - Create the necessary local directories if they don't exist.
  - Write the fetched component source files to the local file system.
- **Public API Changes**: Expose the `add` command to the CLI users.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run build -w packages/cli` and then execute `node packages/cli/bin/helios.js add button`.
- **Success Criteria**: The component files for `button` are successfully written to the local disk and a success message is printed to the console.
- **Edge Cases**: Missing component argument, component not found in registry, network failures, local file already exists (preventing overwrite without flag).
