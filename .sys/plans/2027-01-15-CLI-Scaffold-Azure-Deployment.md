**1. Context & Goal**
**Objective**: Implement the `helios deploy azure` command to scaffold Azure Functions deployment configuration.
**Trigger**: The Azure Functions infrastructure adapter exists, but the CLI lacks a command to scaffold the required deployment manifests.
**Impact**: Unblocks users from deploying their rendering workloads to Azure Functions.

**2. File Inventory**
**Create**: [None]
**Modify**: `packages/cli/src/commands/deploy.ts` (Add the `azure` subcommand and required templates)
**Read-Only**: [None]

**3. Implementation Spec**
**Architecture**: Extend the Commander.js `deploy` command with an `azure` subcommand. Use `prompts` to ask for overwrite confirmation and write the required templates.
**Pseudo-Code**: Define string constants for Azure templates. Add `.command('azure')` to the `deploy` command. Inside the action, prompt the user before creating each file if it exists. Write the templates to the cwd.
**Public API Changes**: Adds `helios deploy azure` CLI command.
**Dependencies**: None.

**4. Test Plan**
**Verification**: Run `npx tsx packages/cli/src/index.ts deploy azure` in a temporary directory and verify that the Azure Function deployment files are created.
**Success Criteria**: The CLI correctly prompts for overwrites and writes the expected template files.
**Edge Cases**: Existing files should trigger a prompt and can be skipped or overwritten.
