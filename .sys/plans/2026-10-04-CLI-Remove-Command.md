# Plan: Implement `helios remove` Command

## 1. Context & Goal
- **Objective**: Implement the `helios remove <component>` command to allow users to unregister components from their project.
- **Trigger**: Vision Gap in Registry Workflow. While `add` and `list` exist, there is no mechanism to cleanly remove a component from `helios.config.json`, forcing users to manually edit configuration files.
- **Impact**: Improves the "Component Registry" lifecycle management by preventing state drift between the file system and configuration. This aligns with the V2 goal of a robust CLI for workflows.

## 2. File Inventory
- **Create**:
  - `packages/cli/src/commands/remove.ts`: The command definition.
  - `packages/cli/src/utils/uninstall.ts`: The core logic for unregistering components.
- **Modify**:
  - `packages/cli/src/index.ts`: Register the new command.
- **Read-Only**:
  - `packages/cli/src/utils/config.ts`: To understand config loading/saving.
  - `packages/cli/src/registry/client.ts`: To fetch component definitions for file tracking.

## 3. Implementation Spec

### Architecture
- **Command Pattern**: Uses Commander.js to define `helios remove <component>`.
- **Logic Separation**: Command handles CLI args/output; `uninstallComponent` utility handles logic.
- **Non-Destructive Approach**: In alignment with the "Users own the code" philosophy, this command will **NOT** delete source files automatically. It will:
  1. Remove the component from `helios.config.json` (Source of Truth).
  2. Attempt to fetch the component definition from the registry.
  3. Identify associated files.
  4. Inform the user which files can be manually deleted.

### Pseudo-Code

**`src/utils/uninstall.ts`**
```typescript
export async function uninstallComponent(rootDir: string, componentName: string) {
  // 1. Load config using loadConfig(rootDir)
  // 2. Validate component exists in config.components
  // 3. Remove component from config.components and call saveConfig(config, rootDir)
  // 4. Log success: "Removed X from configuration"

  // 5. Attempt to find component in Registry (respecting config.framework)
  //    - Use defaultClient.findComponent(componentName, config.framework)
  // 6. If found:
  //    - Resolve target base directory (rootDir + config.directories.components)
  //    - Iterate over component.files
  //    - Check which files exist on disk
  //    - If any exist, Log Warning: "The following files are no longer tracked and can be safely deleted:"
  //      - list files
  // 7. If registry fetch fails (offline/unknown), Log: "Could not verify associated files. Please check src manually."
}
```

**`src/commands/remove.ts`**
```typescript
registerRemoveCommand(program) {
  program.command('remove <component>')
    .description('Remove a component from your project configuration')
    .action(async (component) => {
       try {
         await uninstallComponent(process.cwd(), component);
       } catch (e) {
         console.error(chalk.red(e.message));
         process.exit(1)
       }
    })
}
```

### Public API Changes
- New CLI command: `helios remove <component>`

### Dependencies
- No external dependencies. Uses existing `RegistryClient` and config utilities.

## 4. Test Plan
- **Verification**:
  1. Initialize a temporary project: `helios init`
  2. Add a component: `helios add Button`
  3. Verify it appears in `helios.config.json`.
  4. Run `helios remove Button`.
  5. Verify it is **gone** from `helios.config.json`.
  6. Verify the console outputs the list of `Button` related files to delete.
  7. Run `helios remove NonExistent` and verify error handling.
- **Success Criteria**: Component is removed from config, user is informed of files to delete.
- **Edge Cases**:
  - Component not in config (Error).
  - Registry offline (Remove from config, Warn about files).
  - Config missing (Error).
