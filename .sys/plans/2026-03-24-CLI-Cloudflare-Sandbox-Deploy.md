#### 1. Context & Goal
- **Objective**: Implement the `helios deploy cloudflare-sandbox` command to scaffold the infrastructure required for the Cloudflare Sandbox + Workflows distributed rendering path.
- **Trigger**: The `docs/BACKLOG.md` defines the "Cloudflare Sandbox + Workflows (Proven Path)" as a critical goal for V2 distributed rendering, specifically requiring a `cloudflare-sandbox-adapter.ts`. As the CLI Planner, my responsibility is to bridge the vision gap by expanding the product surface (CLI commands) to deploy this infrastructure.
- **Impact**: This unlocks true stateless distributed rendering using Cloudflare's full Linux containers (Sandboxes) with Chromium and FFmpeg, overcoming the 128MB memory limit of standard Cloudflare Workers. It aligns with the "Monetization Readiness" and "Distributed Rendering" goals.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/templates/cloudflare-sandbox.ts` (Templates for `wrangler.toml`, Sandbox Worker script, and README)
- **Modify**:
  - `packages/cli/src/commands/deploy.ts` (Add the `cloudflare-sandbox` command)
- **Read-Only**:
  - `packages/cli/src/commands/job.ts` (To understand how adapters are invoked)
  - `docs/BACKLOG.md` (For Sandbox constraints: `keepAlive: true`, `getSandbox()`, FFmpeg)

#### 3. Implementation Spec
- **Architecture**:
  - Create a new subcommand under `helios deploy` named `cloudflare-sandbox`.
  - Use `prompts` to ask for the project name and Cloudflare account details.
  - Generate a `wrangler.toml` configured for Cloudflare Workflows and Sandboxes (enabling necessary experimental flags if required, or simply defining the Workflow bindings).
  - Generate a `src/worker.ts` template that implements a Cloudflare Workflow. The workflow will:
    1. Receive a rendering job.
    2. Provision a Sandbox environment (`getSandbox({ keepAlive: true })`).
    3. Execute the rendering chunk inside the Sandbox (running Chromium/FFmpeg).
    4. Handle log harvesting and R2 storage integration (mocked or templated).
  - Write a `README-CLOUDFLARE-SANDBOX.md` with instructions on how to deploy using `wrangler deploy` and run jobs using `helios job run --adapter cloudflare-sandbox`.
- **Pseudo-Code**:
  ```javascript
  deploy.command('cloudflare-sandbox').action(async () => {
    // 1. Prompt for project details
    // 2. Write wrangler.toml using CLOUDFLARE_SANDBOX_TOML_TEMPLATE
    // 3. Write src/worker.ts using CLOUDFLARE_SANDBOX_WORKER_TEMPLATE
    // 4. Write README-CLOUDFLARE-SANDBOX.md
    // 5. Output success message
  });
  ```
- **Public API Changes**:
  - Exposes `helios deploy cloudflare-sandbox` to the user.
- **Dependencies**:
  - The `@helios-project/infrastructure` package will eventually need a corresponding `CloudflareSandboxAdapter` (a separate task for the Infrastructure agent), but the CLI deployment scaffold can be built first to define the contract.

#### 4. Test Plan
- **Verification**:
  - Run `npm run build -w packages/cli`.
  - Execute `node packages/cli/dist/index.js deploy cloudflare-sandbox` in a temporary directory.
- **Success Criteria**:
  - The command prompts for input and successfully generates `wrangler.toml`, `src/worker.ts`, and `README-CLOUDFLARE-SANDBOX.md`.
  - The generated worker template includes `getSandbox({ keepAlive: true })` as specified in the backlog constraints.
- **Edge Cases**:
  - Handle existing files by prompting to overwrite.
