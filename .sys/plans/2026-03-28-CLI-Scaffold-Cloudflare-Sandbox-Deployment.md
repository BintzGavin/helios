# Scaffold Cloudflare Sandbox Deployment Command

## 1. Context & Goal
- **Objective**: Implement `helios deploy cloudflare-sandbox` to scaffold the necessary deployment files for Cloudflare Workflows and Sandboxes.
- **Trigger**: The Infrastructure agent has completed the `CloudflareSandboxAdapter`, but users need a way to deploy the required Cloudflare Workflow infrastructure (`getSandbox({ keepAlive: true })`) to run distributed rendering jobs.
- **Impact**: This unblocks the usage of the Cloudflare Sandbox execution adapter, providing users with a ready-to-deploy configuration for the "Proven Path" of Cloudflare distributed rendering, fulfilling the V2 vision.

## 2. File Inventory
- **Create**:
  - `packages/cli/src/templates/cloudflare-sandbox.ts` (Templates for Cloudflare Workflow deployment)
- **Modify**:
  - `packages/cli/src/commands/deploy.ts` (Add `cloudflare-sandbox` subcommand)
- **Read-Only**:
  - `packages/cli/src/templates/cloudflare.ts` (To avoid naming collisions and understand existing patterns)
  - `packages/infrastructure/src/adapters/cloudflare-sandbox-adapter.ts` (To understand required configuration)

## 3. Implementation Spec
- **Architecture**: Use Commander.js subcommands to extend `helios deploy` with `cloudflare-sandbox`. Use existing `prompts` logic for interactive file creation.
- **Pseudo-Code**:
  1. Define template strings in `cloudflare-sandbox.ts`:
     - `WORKFLOW_WRANGLER_TOML_TEMPLATE`: `wrangler.toml` with Workflow configuration.
     - `WORKFLOW_SRC_TEMPLATE`: `src/workflow.ts` containing the Cloudflare Workflow orchestration logic using `getSandbox()`.
     - `README_CLOUDFLARE_SANDBOX_TEMPLATE`: Deployment instructions for Workflows.
  2. In `deploy.ts`, register `cloudflare-sandbox`:
     ```typescript
     deploy.command('cloudflare-sandbox')
       .description('Scaffold Cloudflare Workflows and Sandbox deployment configuration')
       .action(async () => {
         // Create wrangler.toml
         // Create src/workflow.ts
         // Create README-CLOUDFLARE-SANDBOX.md
       });
     ```
- **Public API Changes**: New CLI command `helios deploy cloudflare-sandbox`.
- **Dependencies**: None. The `CloudflareSandboxAdapter` is already built.

## 4. Test Plan
- **Verification**: Run `node bin/helios.js deploy cloudflare-sandbox` in a temporary directory.
- **Success Criteria**: `wrangler.toml`, `src/workflow.ts`, and `README-CLOUDFLARE-SANDBOX.md` are correctly generated, with appropriate content. Prompts confirm overwrites.
- **Edge Cases**: Verify cancellation (Ctrl+C) works gracefully during prompts. Verify missing `src` directory is created automatically.
