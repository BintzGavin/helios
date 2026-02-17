# 2026-10-28-CLI-Components-Command-Enhanced.md

## 1. Context & Goal
- **Objective**: Enhance the `helios components` command to support filtering by name and framework, and display component descriptions.
- **Trigger**: Vision gap. The current command only lists names, failing the "Component Listing" vision of a browsable registry.
- **Impact**: Improves developer experience by making it easier to discover and identify relevant components in the registry.

## 2. File Inventory
- **Modify**: `packages/cli/src/commands/components.ts` (Implement new flags and formatting)
- **Read-Only**: `packages/cli/src/registry/client.ts` (Use existing API)

## 3. Implementation Spec
- **Architecture**:
  - Update `registerComponentsCommand` to accept `[query]`, `--framework <name>`, and `--all` options.
  - Fetch components using `RegistryClient`.
  - Perform client-side filtering for `query`.
  - Display results in a formatted list (Name, Type, Description).
- **Pseudo-Code**:
  ```typescript
  program
    .command('components [query]')
    .description('List and search available components')
    .option('-f, --framework <name>', 'Filter by framework (react, vue, svelte, solid, vanilla)')
    .option('-a, --all', 'Show all components (ignore project framework)')
    .action(async (query, options) => {
       // Determine framework filter
       // 1. Default to config.framework
       // 2. If --all, set to undefined
       // 3. If --framework, override
       let frameworkFilter = config?.framework;
       if (options.all) frameworkFilter = undefined;
       if (options.framework) frameworkFilter = options.framework;

       const components = await client.getComponents(frameworkFilter);

       // Filter by query (name or description)
       const filtered = query ? components.filter(c =>
         c.name.toLowerCase().includes(query.toLowerCase()) ||
         c.description?.toLowerCase().includes(query.toLowerCase())
       ) : components;

       if (filtered.length === 0) {
          console.log('No components found.');
          return;
       }

       console.log(chalk.bold('Available components:'));
       filtered.forEach(c => {
         console.log(` - ${chalk.cyan(c.name)} ${chalk.gray(`(${c.type})`)}`);
         if (c.description) {
           console.log(`   ${c.description}`);
         }
       });
    });
  ```
- **Public API Changes**: `helios components` now accepts `[query]` argument and `-f`/`-a` flags.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  - Run `helios components` in a project (should list project-compatible components).
  - Run `helios components --all` (should list all components).
  - Run `helios components button` (should list matching components).
  - Run `helios components --framework vue` (should list vue components).
- **Success Criteria**: Output includes descriptions and respects filters.
- **Edge Cases**: No components found, query matches nothing, config missing.
