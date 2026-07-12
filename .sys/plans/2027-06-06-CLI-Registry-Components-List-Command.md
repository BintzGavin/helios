#### 1. Context & Goal
- **Objective**: Implement the `helios components` CLI command to browse the registry.
- **Trigger**: The prompt specifies missing registry commands (specifically listing components).
- **Impact**: Enables users to view available components before installation.

#### 2. File Inventory
- **Create**: packages/cli/src/commands/components.ts
- **Modify**: packages/cli/src/index.ts (register command)
- **Read-Only**: packages/cli/src/registry/client.ts

#### 3. Implementation Spec
- **Architecture**: Using Commander.js subcommands, fetch from registry URL and list components.
- **Pseudo-Code**:
  ```typescript
  // Get registry client
  // Fetch components index
  // Format output as table
  // console.log
  ```
- **Public API Changes**: Export new Commander command in components.ts
- **Dependencies**: RegistryClient must support listing components.

#### 4. Test Plan
- **Verification**: `helios components`
- **Success Criteria**: Displays a formatted list of components.
- **Edge Cases**: Empty registry, fetch failures.
