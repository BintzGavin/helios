#### 1. Context & Goal
- **Objective**: Expose the `CloudflareSandboxAdapter` in the `helios job run` CLI command.
- **Trigger**: The Infrastructure domain recently implemented the `CloudflareSandboxAdapter` (and `R2StorageAdapter`) as part of the "Cloudflare Sandbox + Workflows" proven path for distributed rendering, but this adapter is not yet exposed via the CLI `job run` command. The command already has `cloudflare` (for Workers) and needs `cloudflare-sandbox`. The deploy command `helios deploy cloudflare-sandbox` already exists.
- **Impact**: This completes the product surface for the Cloudflare Sandbox execution adapter, allowing users to orchestrate full Linux container renders (with Chromium + FFmpeg) orchestrated by Cloudflare Workflows directly from the CLI.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/cli/src/commands/job.ts` - Update the CLI command to accept `--adapter cloudflare-sandbox` and the required options for `CloudflareSandboxAdapter`.
- **Read-Only**: `packages/infrastructure/src/adapters/cloudflare-sandbox-adapter.ts` - To check its configuration interface.
- **Read-Only**: `AGENTS.md` and `docs/BACKLOG.md` - To ensure alignment with the vision.

#### 3. Implementation Spec
- **Architecture**:
  - Extend the existing Commander configuration in `packages/cli/src/commands/job.ts` to add CLI options specific to Cloudflare Sandboxes: `--cloudflare-account-id`, `--cloudflare-api-token`, `--cloudflare-namespace`.
  - Add `cloudflare-sandbox` to the list of accepted adapters in the `--adapter` option description.
  - In the command's `.action()` handler, add an `else if (options.adapter === 'cloudflare-sandbox')` branch.
  - Instantiate `CloudflareSandboxAdapter` from `@helios-project/infrastructure` using the provided options. If required arguments are missing, throw an error.
  - **Note**: The adapter requires `accountId`, `apiToken`, and `namespace`.
- **Pseudo-Code**:
  ```typescript
  // In job.ts Commander options
  .option('--adapter <type>', 'Adapter to use (..., cloudflare, cloudflare-sandbox, ...)')
  .option('--cloudflare-account-id <id>', 'Cloudflare account ID for Sandbox adapter')
  .option('--cloudflare-api-token <token>', 'Cloudflare API token with Sandbox permissions')
  .option('--cloudflare-namespace <namespace>', 'Cloudflare Sandbox namespace')

  // In job.ts action handler
  else if (options.adapter === 'cloudflare-sandbox') {
    if (!options.cloudflareAccountId || !options.cloudflareApiToken || !options.cloudflareNamespace) {
      throw new Error('Cloudflare Sandbox adapter requires --cloudflare-account-id, --cloudflare-api-token, and --cloudflare-namespace');
    }
    adapter = new CloudflareSandboxAdapter({
      accountId: options.cloudflareAccountId,
      apiToken: options.cloudflareApiToken,
      namespace: options.cloudflareNamespace,
      // optional configs can be passed if available
    });
  }
  ```
- **Public API Changes**: Adds `--adapter cloudflare-sandbox` and related options to the `helios job run` command.
- **Dependencies**: None. The infrastructure adapter is already implemented.

#### 4. Test Plan
- **Verification**: Run `npx tsx packages/cli/src/index.ts job run my-job.json --adapter cloudflare-sandbox --cloudflare-account-id dummy --cloudflare-api-token dummy --cloudflare-namespace dummy` and verify it attempts to instantiate the adapter rather than falling back to `LocalWorkerAdapter` or throwing an unknown adapter error.
- **Success Criteria**: The CLI correctly parses the arguments and initializes the `CloudflareSandboxAdapter`.
- **Edge Cases**: Missing required options should throw a clear validation error.
