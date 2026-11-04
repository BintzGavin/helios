#### 1. Context & Goal
- **Objective**: Implement the `helios add` command to fetch and copy components from the registry.
- **Trigger**: The prompt explicitly identifies a vision gap where the CLI currently only has the `studio` command, but the backlog requires a command to fetch and copy components.
- **Impact**: Unlocks the ability for users to download and use Shadcn-style components directly in their projects, bridging the gap to the V2 component economy vision.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/commands/add.ts`: New Commander.js subcommand for `helios add`.
- **Modify**:
  - `packages/cli/src/index.ts`: Register the new `add` command.
- **Read-Only**:
  - `packages/cli/src/commands/studio.ts`: Reference for existing command patterns.

#### 3. Implementation Spec
- **Architecture**: Using Commander.js subcommands, parse the component name and fetch its source from the component registry URL. Write the fetched component source code into the user's project directory (e.g., `components/` or configured path).
- **Pseudo-Code**:
  - `program.command('add <component>')`
  - `action(async (component) => {`
  - `  const registryUrl = getRegistryUrl();`
  - `  const source = await fetch(\`\${registryUrl}/\${component}.ts\`);`
  - `  await fs.writeFile(\`./components/\${component}.ts\`, source);`
  - `  console.log(\`Added \${component}\`);`
  - `})`
- **Public API Changes**: Exports a new command function `addCommand(program)`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `helios add button` and verify `button.ts` is copied into the `components/` folder.
- **Success Criteria**: Terminal outputs success message and the exact file contents are present locally.
- **Edge Cases**: Component not found, network failure, missing local `components/` directory.
