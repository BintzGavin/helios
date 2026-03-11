#### 1. Context & Goal
- **Objective**: Implement CLI deployment command scaffolding for Cloudflare Workers.
- **Trigger**: The INFRASTRUCTURE domain recently implemented a `CloudflareWorkersAdapter` for distributed rendering, and the CLI `job` command supports `--adapter cloudflare`, but `helios deploy cloudflare` is missing to scaffold the necessary deployment configurations (like Wrangler file and worker script).
- **Impact**: This expands the "Primary interface for workflows and deployment" vision (AGENTS.md) by making it easy for users to deploy stateless rendering workers to Cloudflare's edge network.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/templates/cloudflare.ts` (Templates for Wrangler config, Cloudflare Worker script, and README)
- **Modify**:
  - `packages/cli/src/commands/deploy.ts` (Add `cloudflare` subcommand)
- **Read-Only**:
  - `docs/BACKLOG.md`
  - `packages/infrastructure/src/adapters/cloudflare-workers-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: We'll use Commander.js to add a `cloudflare` subcommand to `helios deploy`. This command will generate two files required to run a Cloudflare Worker:
  1. `wrangler.toml`: The standard Cloudflare configuration file.
  2. `src/worker.ts`: The actual worker script using `@helios-project/infrastructure` to process rendering chunks via `WorkerRuntime`.
  3. `README-CLOUDFLARE.md`: Documentation on how to deploy and execute the job.
- **Pseudo-Code**:
  - Create `cloudflare.ts` in `templates/` with string constants:
    - `WRANGLER_TOML_TEMPLATE`: Basic config including node compatability.
    - `CLOUDFLARE_WORKER_TEMPLATE`: A simple fetch handler that reads the JSON payload (`jobPath`, `chunkIndex`), initializes `WorkerRuntime`, runs the job, and returns the result.
    - `README_CLOUDFLARE_TEMPLATE`: Instructions using `wrangler deploy` and `helios job run --adapter cloudflare`.
  - In `deploy.ts`, register `.command('cloudflare')` under `deploy`.
  - Use `prompts` to check file existence (`wrangler.toml`, `src/worker.ts`, `README-CLOUDFLARE.md`) and confirm overwrites.
  - Write files using `fs.writeFileSync`.
  - Log success and instructions using `chalk`.
- **Public API Changes**: Adds `helios deploy cloudflare` command.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run build -w packages/cli` then execute `node packages/cli/bin/helios.js deploy cloudflare` in a temporary directory and verify that `wrangler.toml`, `src/worker.ts`, and `README-CLOUDFLARE.md` are generated correctly.
- **Success Criteria**: The `helios deploy cloudflare` command successfully scaffolds the required Cloudflare Worker configuration and script.
- **Edge Cases**: Ensure the command gracefully handles existing files (prompts to overwrite) and Ctrl+C cancellations.
