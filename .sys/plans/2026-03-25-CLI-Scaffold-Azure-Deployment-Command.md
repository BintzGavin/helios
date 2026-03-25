#### 1. Context & Goal
- **Objective**: Implement `helios deploy azure` to scaffold Azure Functions deployment configuration and documentation.
- **Trigger**: Backlog item "Cloud execution adapter (Azure Functions)" requires a corresponding CLI command to scaffold deployment files, similar to existing AWS and GCP commands.
- **Impact**: Enables users to easily deploy Helios rendering jobs to Azure Functions, completing the Azure adapter integration.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/templates/azure.ts` (Templates for `host.json`, `local.settings.json`, `function.json`, `index.js`, and `README-AZURE.md`)
- **Modify**:
  - `packages/cli/src/commands/deploy.ts` (Add `azure` subcommand to the `deploy` command)
- **Read-Only**:
  - `packages/cli/src/templates/aws.ts` (Reference for template structure)
  - `packages/infrastructure/src/adapters/azure-functions-adapter.ts` (Reference for adapter payload requirements)

#### 3. Implementation Spec
- **Architecture**: Use Commander.js subcommands to add `azure` under `deploy`. The command will use `prompts` to confirm file overwrites and `fs` to write templates to the current working directory.
- **Pseudo-Code**:
  - Define `AZURE_HOST_JSON_TEMPLATE`, `AZURE_LOCAL_SETTINGS_TEMPLATE`, `AZURE_FUNCTION_JSON_TEMPLATE`, `AZURE_INDEX_JS_TEMPLATE`, and `README_AZURE_TEMPLATE` in `packages/cli/src/templates/azure.ts`.
  - In `packages/cli/src/commands/deploy.ts`, import templates from `../templates/azure.js` and add `.command('azure')` to the `deploy` command.
  - Inside the action, prompt the user for each file (`host.json`, `local.settings.json`, `RenderJob/function.json`, `RenderJob/index.js`, `README-AZURE.md`).
  - If confirmed, create directories if needed (`RenderJob`) and write the corresponding template using `fs.writeFileSync`.
  - Print success message.
- **Public API Changes**: Adds `helios deploy azure` command.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `node packages/cli/bin/helios.js deploy azure` in a temporary directory and verify that all Azure Functions scaffolding files are created correctly.
- **Success Criteria**: `host.json`, `local.settings.json`, `RenderJob/function.json`, `RenderJob/index.js`, and `README-AZURE.md` exist and contain the correct template content.
- **Edge Cases**: User cancels a prompt (should skip the file), files already exist (should prompt to overwrite).
