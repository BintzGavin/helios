#### 1. Context & Goal
- **Objective**: Implement the `helios components` command to fetch and list available components from the registry.
- **Trigger**: Vision gap identified from prompt backlog items ("Implement registry commands" and "Component Listing - `helios components` to browse available registry components").
- **Impact**: Unlocks the component registry for users, allowing them to discover and browse Shadcn-style components directly from their CLI.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/commands/components.ts`: Implements the `helios components` command logic.
- **Modify**:
  - `packages/cli/src/index.ts`: Register the new `components` command.
- **Read-Only**:
  - `packages/cli/src/registry/client.ts`: To understand the registry API for fetching and listing components.

#### 3. Implementation Spec
- **Architecture**: Using Commander.js subcommands to implement `components`. It will fetch the list of available components using the RegistryClient and display them in the terminal.
- **Pseudo-Code**:
  - In `components.ts`:
    - Define command `components [query]`.
    - Define options `--framework` and `--all`.
    - Initialize RegistryClient.
    - Fetch components using `client.getComponents()`.
    - Filter by framework or query if provided.
    - Log the results clearly using `chalk`.
  - In `index.ts`: Import and call `registerComponentsCommand(program)`.
- **Public API Changes**: Adds the `components` subcommand to the `helios` CLI.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `helios components` to verify the list of components is displayed successfully.
- **Success Criteria**: The `helios components` command outputs a formatted list of components fetched from the registry.
- **Edge Cases**: Network failures when fetching from the registry, or no components matching the filter criteria.
