#### 1. Context & Goal
- **Objective**: Integrate Deno Deploy, Vercel Functions, Hetzner Cloud, and Modal execution adapters into the `helios job run` CLI command.
- **Trigger**: The INFRASTRUCTURE domain has implemented adapters for Deno Deploy, Vercel Functions, Hetzner Cloud, and Modal (Tier 3 adapters per BACKLOG.md), but they are not exposed through the CLI's `job` command. This blocks users from leveraging these cloud platforms for distributed rendering via the CLI.
- **Impact**: Enables end-to-end execution of render jobs on Deno Deploy, Vercel Functions, Hetzner Cloud, and Modal directly from the CLI, fulfilling the "Platform Expansion" requirement in the "Distributed Rendering" vision.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/cli/src/commands/job.ts` (Add support for missing adapters)
- **Read-Only**: `packages/infrastructure/src/adapters/deno-deploy-adapter.ts`, `packages/infrastructure/src/adapters/vercel-adapter.ts`, `packages/infrastructure/src/adapters/hetzner-cloud-adapter.ts`, `packages/infrastructure/src/adapters/modal-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: Extend the existing Commander.js setup in `registerJobCommand` to accept options for the new adapters and map them to the corresponding `WorkerAdapter` implementations from `@helios-project/infrastructure`.
- **Pseudo-Code**:
  1.  **Add Options**: Extend the `.option` list in `registerJobCommand`:
      -   Add adapter names `deno`, `vercel`, `hetzner`, `modal` to the `--adapter` description.
      -   Add options for Deno: `--deno-service-url <url>`, `--deno-auth-token <token>`.
      -   Add options for Vercel: `--vercel-service-url <url>`, `--vercel-auth-token <token>`.
      -   Add options for Hetzner: `--hetzner-api-token <token>`, `--hetzner-server-type <type>`, `--hetzner-image <image>`, `--hetzner-location <location>`, `--hetzner-ssh-key-id <id>`.
      -   Add options for Modal: `--modal-endpoint-url <url>`, `--modal-auth-token <token>`.
  2.  **Import Adapters**: Update the import from `@helios-project/infrastructure` to include `DenoDeployAdapter`, `VercelAdapter`, `HetznerCloudAdapter`, and `ModalAdapter`.
  3.  **Instantiate Adapters**: Extend the `if/else if` block that initializes `adapter`:
      -   `if (options.adapter === 'deno')`: Validate `--deno-service-url`. Instantiate `DenoDeployAdapter` with `serviceUrl` and `authToken`.
      -   `if (options.adapter === 'vercel')`: Validate `--vercel-service-url`. Instantiate `VercelAdapter` with `serviceUrl`, `authToken`, and `jobDefUrl` defaulting to `file`.
      -   `if (options.adapter === 'hetzner')`: Validate `--hetzner-api-token`, `--hetzner-server-type`, and `--hetzner-image`. Instantiate `HetznerCloudAdapter` with `apiToken`, `serverType`, `image`, `location`, and parsed `sshKeyId`.
      -   `if (options.adapter === 'modal')`: Validate `--modal-endpoint-url`. Instantiate `ModalAdapter` with `endpointUrl` and `authToken`.
- **Public API Changes**:
  - `helios job run` will accept new adapter values and flags. No changes to programmatic exports.
- **Dependencies**:
  - None. The adapters are already implemented and exported in `packages/infrastructure/src/index.ts`.

#### 4. Test Plan
- **Verification**: Execute `npx tsx packages/cli/src/index.ts job run dummy.json --adapter deno`, `npx tsx packages/cli/src/index.ts job run dummy.json --adapter vercel`, `npx tsx packages/cli/src/index.ts job run dummy.json --adapter hetzner`, and `npx tsx packages/cli/src/index.ts job run dummy.json --adapter modal` without required flags and verify it throws the expected validation error (e.g., "Deno adapter requires --deno-service-url").
- **Success Criteria**: The CLI parses the new flags, validates required inputs, and attempts to instantiate the adapters correctly.
- **Edge Cases**: Missing required flags for each adapter, numeric conversion for Hetzner SSH key ID.
