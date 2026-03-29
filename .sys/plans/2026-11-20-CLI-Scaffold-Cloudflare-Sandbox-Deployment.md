#### 1. Context & Goal
- **Objective**: Implement the `helios deploy cloudflare-sandbox` command to scaffold the necessary infrastructure files (Cloudflare Workflows and Wrangler configuration) required for the `CloudflareSandboxAdapter`.
- **Trigger**: The `.jules/CLI.md` and `docs/BACKLOG.md` indicate that before the `CloudflareSandboxAdapter` can be fully utilized, a deployment scaffold for the underlying infrastructure (Cloudflare Workflows + Sandbox configuration) needs to be provided by the CLI.
- **Impact**: This unlocks the ability for users to easily deploy the required Cloudflare infrastructure to use the `CloudflareSandboxAdapter` for distributed rendering, bridging the gap identified in the project vision.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/templates/cloudflare-sandbox.ts` (Contains templates for `wrangler.toml`, workflow source `src/index.ts`, and `README-CLOUDFLARE-SANDBOX.md`)
- **Modify**:
  - `packages/cli/src/commands/deploy.ts` (Add the `cloudflare-sandbox` subcommand to scaffold the templates)
- **Read-Only**:
  - `docs/BACKLOG.md`
  - `.jules/CLI.md`
  - `packages/infrastructure/src/adapters/cloudflare-sandbox-adapter.ts`
  - `examples/distributed-rendering/cloudflare-workflow/wrangler.toml`

#### 3. Implementation Spec
- **Architecture**:
  - Extend Commander.js `deploy` command with a new subcommand `cloudflare-sandbox`.
  - The command will create a `wrangler.toml`, a `src/index.ts` file implementing the Cloudflare Workflow, and a `README-CLOUDFLARE-SANDBOX.md` guide.
  - The templates will closely mirror the proven path found in `examples/distributed-rendering/cloudflare-workflow/wrangler.toml` and its `src/index.ts`.
- **Pseudo-Code**:
  - Define string constants in `packages/cli/src/templates/cloudflare-sandbox.ts` for `WRANGLER_TOML_TEMPLATE`, `WORKFLOW_TS_TEMPLATE`, and `README_CLOUDFLARE_SANDBOX_TEMPLATE`.
  - In `packages/cli/src/commands/deploy.ts`, import these templates.
  - Add `.command('cloudflare-sandbox')` to the `deploy` command group.
  - Inside the action handler, define paths for the new files.
  - Check for existence and prompt for overwrite.
  - Write the template contents to the respective files.
- **Public API Changes**:
  - Adds `helios deploy cloudflare-sandbox` to the CLI surface.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run build -w packages/cli` and then execute `npx tsx packages/cli/src/index.ts deploy cloudflare-sandbox`. Check that the files `wrangler.toml`, `src/index.ts`, and `README-CLOUDFLARE-SANDBOX.md` are correctly generated.
- **Success Criteria**: The `helios deploy cloudflare-sandbox` command successfully creates the deployment scaffold files required for the Cloudflare Sandbox Workflow without errors.
- **Edge Cases**: Ensure the command gracefully handles existing files by prompting the user for an overwrite decision and skipping file creation if the user declines.
