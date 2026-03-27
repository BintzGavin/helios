#### 1. Context & Goal
- **Objective**: Implement scaffolding for the Cloudflare Sandbox + Workflows deployment configuration (`helios deploy cloudflare-sandbox`).
- **Trigger**: The V2 vision in `AGENTS.md` and `docs/BACKLOG.md` defines Cloudflare Sandbox + Workflows as the proven path for distributed rendering, but the CLI lacks a deployment command for it.
- **Impact**: This unlocks the ability for users to easily deploy the required Cloudflare Workflows infrastructure, which is a prerequisite for the `CloudflareSandboxAdapter` in the Infrastructure package.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/templates/cloudflare-sandbox.ts` (Templates for Cloudflare Sandbox + Workflows deployment: `wrangler.toml`, workflow script, and README).
- **Modify**:
  - `packages/cli/src/commands/deploy.ts` (Add `cloudflare-sandbox` command to the `deploy` command group).
- **Read-Only**:
  - `docs/BACKLOG.md` (Reference for Cloudflare Sandbox + Workflows requirements).
  - `packages/cli/src/templates/cloudflare.ts` (Reference for existing Cloudflare Workers templates).

#### 3. Implementation Spec
- **Architecture**:
  - Use Commander.js to add a new subcommand `cloudflare-sandbox` to the `deploy` command.
  - Create a new template file `cloudflare-sandbox.ts` exporting constants for `WRANGLER_TOML_TEMPLATE`, `WORKFLOW_TS_TEMPLATE`, and `README_CLOUDFLARE_SANDBOX_TEMPLATE`.
  - The `wrangler.toml` template should configure the workflow as required by Cloudflare Sandboxes.
  - The workflow template should implement a durable multi-step execution that orchestrates full Linux containers as described in the backlog.
  - The `deploy.ts` action will write these templates to the user's current working directory (`wrangler.toml`, `src/workflow.ts`, `README-CLOUDFLARE-SANDBOX.md`).
- **Pseudo-Code**:
  // packages/cli/src/commands/deploy.ts
  deploy.command('cloudflare-sandbox')
    .description('Scaffold Cloudflare Sandbox + Workflows deployment configuration')
    .action(async () => {
      // Define paths (wrangler.toml, src/workflow.ts, README-CLOUDFLARE-SANDBOX.md)
      // Write WRANGLER_TOML_TEMPLATE
      // Ensure src directory exists
      // Write WORKFLOW_TS_TEMPLATE
      // Write README_CLOUDFLARE_SANDBOX_TEMPLATE
      // Log success message
    });
- **Public API Changes**:
  - New CLI command: `helios deploy cloudflare-sandbox`.
- **Dependencies**: None. This is a prerequisite for the Infrastructure agent.

#### 4. Test Plan
- **Verification**: Run `npx tsx packages/cli/src/index.ts deploy cloudflare-sandbox` in a temporary directory.
- **Success Criteria**: Verify that `wrangler.toml`, `src/workflow.ts`, and `README-CLOUDFLARE-SANDBOX.md` are created successfully with the correct content, specifically checking for the Workflow implementation and Sandbox configuration.
- **Edge Cases**: Check behavior when `src/` directory already exists. Verify graceful handling if files already exist (avoiding blind overwrites without prompting, though for simplicity, standard write behavior is fine initially).
