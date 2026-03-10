#### 1. Context & Goal
- **Objective**: Integrate Cloudflare Workers and Azure Functions execution adapters into the `helios job run` command.
- **Trigger**: The backlog indicates we need to expose new cloud execution adapters (Cloudflare Workers, Azure Functions) to fulfill the V2 Distributed Rendering Platform goals (Tier 1 High Impact). These adapters are already implemented in `packages/infrastructure`.
- **Impact**: This unlocks Cloudflare Workers and Azure Functions as execution targets for distributed rendering, expanding the ecosystem of supported platforms via the CLI. It unblocks CLI workflows for infrastructure implementations that are currently unexposed.

#### 2. File Inventory
- **Create**:
  - `/.sys/plans/2026-03-10-CLI-Cloud-Worker-Execution-Azure-Cloudflare.md` - The specification file.
- **Modify**:
  - `packages/cli/src/commands/job.ts` - Add the CLI options and instantiations for Cloudflare Workers and Azure Functions adapters.
- **Read-Only**:
  - `packages/infrastructure/src/adapters/cloudflare-workers-adapter.ts` - Read to verify the constructor configuration for Cloudflare adapter (`serviceUrl`, `authToken`).
  - `packages/infrastructure/src/adapters/azure-functions-adapter.ts` - Read to verify the constructor configuration for Azure adapter (`serviceUrl`, `functionKey`).

#### 3. Implementation Spec
- **Architecture**:
  - Enhance the `helios job run` command using Commander.js.
  - Add a `--cloudflare-service-url <url>` option for the Cloudflare service URL.
  - Add a `--cloudflare-auth-token <token>` option for authentication (Bearer token).
  - Add a `--azure-service-url <url>` option for the Azure Functions service URL.
  - Add a `--azure-function-key <key>` option for the Azure function key.
  - Update the `--adapter <type>` option description to include `cloudflare` and `azure`.
  - Inside the action handler, add `else if` conditions for `options.adapter === 'cloudflare'` and `options.adapter === 'azure'`.
  - For Cloudflare, instantiate `CloudflareWorkersAdapter` passing the configured service URL and auth token. Throw an error if `--cloudflare-service-url` is missing.
  - For Azure, instantiate `AzureFunctionsAdapter` passing the configured service URL and function key. Throw an error if `--azure-service-url` is missing.
- **Pseudo-Code**:
  - Commander.js definition:
    - Add `.option('--cloudflare-service-url <url>', 'Cloudflare Workers service URL')`
    - Add `.option('--cloudflare-auth-token <token>', 'Cloudflare Workers bearer token')`
    - Add `.option('--azure-service-url <url>', 'Azure Functions service URL')`
    - Add `.option('--azure-function-key <key>', 'Azure Functions function key')`
  - Action Handler:
    - `else if (options.adapter === 'cloudflare') { if (!options.cloudflareServiceUrl) throw new Error('Cloudflare adapter requires --cloudflare-service-url'); adapter = new CloudflareWorkersAdapter({ serviceUrl: options.cloudflareServiceUrl, authToken: options.cloudflareAuthToken, jobDefUrl: options.cloudflareJobDefUrl || file }); }`
    - `else if (options.adapter === 'azure') { if (!options.azureServiceUrl) throw new Error('Azure adapter requires --azure-service-url'); adapter = new AzureFunctionsAdapter({ serviceUrl: options.azureServiceUrl, functionKey: options.azureFunctionKey, jobDefUrl: options.azureJobDefUrl || file }); }`
- **Public API Changes**: No core API changes. CLI `job run` command arguments are updated.
- **Dependencies**: None. The infrastructure adapters are already merged in `@helios-project/infrastructure`.

#### 4. Test Plan
- **Verification**: Run `npx tsx packages/cli/src/index.ts job run dummy.json --adapter cloudflare` and expect it to fail with `Cloudflare adapter requires --cloudflare-service-url`. Run with `--cloudflare-service-url https://example.com` and expect execution initialization. Same for Azure.
- **Success Criteria**: The `job.ts` command successfully parses the new arguments, initializes the correct infrastructure adapter without typescript errors, and attempts execution.
- **Edge Cases**: Missing required URLs for each respective adapter should be explicitly caught and error messaging printed.