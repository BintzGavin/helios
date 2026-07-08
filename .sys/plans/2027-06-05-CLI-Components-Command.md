#### 1. Context & Goal
- **Objective**: Implement the `helios components` CLI command to browse available registry components.
- **Trigger**: Documented vision gap in AGENTS.md (CLI is missing Component Listing - `helios components` to browse available registry components).
- **Impact**: Unlocks the ability for users to discover available Shadcn-style components within the registry, a core V2 feature.

#### 2. File Inventory
- **Create**: `packages/cli/src/commands/components.ts` (Implements the `components` command logic)
- **Modify**: `packages/cli/src/index.ts` (Registers the new `components` command)
- **Read-Only**: `packages/cli/src/registry/client.ts` (To fetch the registry index)

#### 3. Implementation Spec
- **Architecture**: Define a Commander.js subcommand for `components`. The command will instantiate a `RegistryClient`, fetch the full index of available components, and print them to the console in a structured, readable format.
- **Pseudo-Code**:
  - Register `components` command.
  - On action execution:
    - Load user configuration.
    - Initialize `RegistryClient`.
    - Call a method to fetch the component index (e.g., `client.getIndex()`).
    - Format and output the list of components (name, description, version, etc.).
    - Handle potential network/registry errors gracefully.
- **Public API Changes**: Exports a new `registerComponentsCommand` function for CLI registration. Exposes `helios components` to end users.
- **Dependencies**: The `RegistryClient` must support index fetching.

#### 4. Test Plan
- **Verification**: Run `helios components` against a mock registry or locally after building.
- **Success Criteria**: The CLI correctly outputs a formatted list of components retrieved from the registry.
- **Edge Cases**: Registry network failure, empty registry response.
