# 2026-02-18-CLI-Enhance-Components-Command.md

#### 1. Context & Goal
- **Objective**: Implement the enhanced `helios components` command as described in the V2 roadmap and status file (v0.28.0), which is currently missing from the codebase.
- **Trigger**: Discrepancy between `docs/status/CLI.md` (claims v0.28.0 has search/filtering) and `packages/cli/src/commands/components.ts` (basic list).
- **Impact**: Enables users to search for components and filter by framework, improving discoverability in the registry. Aligns code with documentation.

#### 2. File Inventory
- **Modify**: `packages/cli/src/commands/components.ts` (Add arguments, options, filtering logic, and description output)
- **Modify**: `packages/cli/package.json` (Bump version to 0.28.0 to match status file)
- **Read-Only**: `packages/cli/src/registry/client.ts` (Use `getComponents` method)

#### 3. Implementation Spec
- **Architecture**:
  - Update `components` command definition in Commander to accept `[query]` argument.
  - Add `--all` option to bypass framework filtering.
  - Add `--framework <name>` option to override project framework.
  - In `action` handler:
    - Determine framework: `--framework` flag > `config.framework` > undefined (if `--all` is set, force undefined).
    - Call `RegistryClient.getComponents(framework)`.
    - Filter results in-memory if `query` is provided (case-insensitive match on `name` or `description`).
    - Format output using `chalk`:
      - Bold component name.
      - Gray type.
      - Dim description on the next line or same line.

- **Pseudo-Code**:
  ```typescript
  program
    .command('components [query]')
    .option('--all', 'Show all components')
    .option('--framework <name>', 'Filter by framework')
    .action(async (query, options) => {
      // Logic to determine effective framework
      let framework: string | undefined = options.framework || config?.framework;
      if (options.all) framework = undefined;

      const components = await client.getComponents(framework);

      // Filter by query
      const filtered = query ? components.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(query.toLowerCase()))
      ) : components;

      if (filtered.length === 0) {
        console.log('No components found.');
        return;
      }

      // Display
      filtered.forEach(c => {
        console.log(`${c.name} (${c.type})`);
        if (c.description) console.log(`  ${c.description}`);
      });
    });
  ```

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  1. Run `helios components` in a project with framework config (expect filtered list).
  2. Run `helios components --all` (expect all components).
  3. Run `helios components button` (expect components with "button" in name/desc).
  4. Run `helios components --framework react` (expect React components).
  5. Verify output includes descriptions.
- **Success Criteria**: Command supports arguments/flags and output matches requirements.
- **Edge Cases**:
  - No components found (handled).
  - Registry unreachable (handled by `RegistryClient`).
  - Invalid framework (registry client filters out mismatches).
