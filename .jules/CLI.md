# CLI Agent Journal

Critical learnings only. This is not a log—only add entries for insights that will help avoid mistakes or make better decisions.

## [0.1.0] - Initial State
**Learning:** The CLI package was created with minimal structure. It uses Commander.js and has a single `studio` command that spawns the Studio dev server. The pattern for adding new commands is to create a file in `src/commands/` with a `registerXCommand(program)` function.
**Action:** Follow the established pattern when adding new commands. Import and register in `src/index.ts`.

## [0.4.1] - Renderer Dependency
**Learning:** The CLI does not depend on `@helios-project/renderer` by default. To implement `helios render`, this dependency must be added. The `Renderer` class in `packages/renderer` exposes the necessary API (`render(url, output, options)`), making it suitable for direct consumption by the CLI.
**Action:** Ensure `packages/cli/package.json` includes `@helios-project/renderer` when implementing render commands.

## [0.4.1] - Distributed Rendering Gap
**Learning:** `helios render` lacked flags for frame ranges (`--start-frame`, `--frame-count`) required for distributed rendering, even though `@helios-project/renderer` supports them.
**Action:** Always check the underlying package capabilities (like `Renderer`) when implementing CLI commands to ensure full feature parity.

## [0.4.1] - Init Scope Gap
**Learning:** `helios init` was documented as "implemented" but only generated a config file, lacking the project scaffolding required by the Vision ("scaffold new Helios projects"). "Implemented" status can obscure scope gaps.
**Action:** Verify "implemented" commands against the Vision (`AGENTS.md`) to distinguish between "MVP exists" and "Vision Complete".

## [0.6.0] - Registry Architecture
**Learning:** The existing component registry was hardcoded in `manifest.ts` (V1 MVP), conflicting with the V2 "Shadcn-style" vision which requires dynamic/remote fetching.
**Action:** Created plan `2026-03-01-CLI-Remote-Registry.md` to decouple the registry. Future implementations must prioritize externalizing data sources over embedding them in the binary.

## [0.7.0] - Remote Data Validation
**Learning:** Fetching data from a remote registry introduced risks of runtime crashes (e.g., trying to iterate over an error object). Simple `res.json()` is insufficient.
**Action:** Always validate the structure of remote data (e.g., `Array.isArray()`) before consuming it, and handle timeouts to prevent CLI hangs.

## [0.7.0] - Registry Install Gap
**Learning:** `helios add` was marked as implemented but only copied files, failing to install dependencies. This created friction and violated the "Shadcn-style" vision of seamless adoption.
**Action:** When implementing "add" commands, always include dependency management (check/install) to ensure the added component is immediately usable.

## [0.8.0] - Studio Config Blocking
**Learning:** `helios studio` was configured with `configFile: false`, preventing it from loading user-defined `vite.config.ts`. This implicitly blocked support for frameworks requiring plugins (Vue, Svelte) despite the CLI being intended as framework-agnostic.
**Action:** Ensure `helios studio` (and similar host commands) explicitly allows user configuration to support the diverse ecosystem of V2.

## [0.9.0] - Phantom Implementation
**Learning:** System memory stated that `helios render` supported `--concurrency` via `RenderOrchestrator`, but the code (`render.ts`) showed it only used the basic `Renderer` class. Documentation and Memory can drift from Code Reality.
**Action:** Trust Code over Memory. Always verify the existence of a feature in `src/` before assuming it is implemented, even if status files claim it exists.

## [0.9.1] - Render Concurrency Reality
**Learning:** Contrary to the [0.9.0] entry, `helios render` DOES support `--concurrency` and uses `RenderOrchestrator`. The previous observation was incorrect or outdated.
**Action:** Double-check imports when verifying code. `render.ts` correctly delegates to `RenderOrchestrator`.

## [0.9.1] - Registry Tracking Gap
**Learning:** `helios add` installs components but does not record them in `helios.config.json` or any lockfile. This prevents inventory management (`list --installed`) and future updates (`helios update`).
**Action:** When designing package managers or registries, always include a mechanism to track installed assets (like `components.json` or `package.json` deps) to enable lifecycle management.

## [0.10.0] - Studio Registry Disconnect
**Learning:** `helios studio` was passing a static local registry to the UI, ignoring the remote registry logic implemented in `helios add` (via `RegistryClient`). This caused the Studio UI to show outdated component lists even if the CLI could fetch new ones.
**Action:** When a shared resource (like Registry) is accessed by multiple commands (`add`, `studio`), ensure they all use the same client/abstraction (`RegistryClient`) to maintain consistency.

## [0.12.0] - Registry Lifecycle Gap
**Learning:** While `helios add` and `helios list` existed, the CLI lacked a `helios remove` command, leading to potential state drift between `helios.config.json` and the file system. Users had to manually edit config files to unregister components.
**Action:** When implementing CRUD workflows (like Registry management), always ensure the full lifecycle (Create, Read, Update, Delete) is supported to prevent orphaned state.

## [0.15.0] - Distributed Orchestration Decoupling
**Learning:** The "Distributed Rendering" vision requires a separation of "Planning" (job splitting) and "Execution" (rendering). The `RenderOrchestrator` in `packages/renderer` tightly couples them (calculating chunks and immediately spawning workers). This blocks external/cloud orchestration.
**Action:** When bridging a "Cloud" gap without cloud infrastructure, implement the "Planning" phase as a standalone artifact (e.g., Job Spec JSON) in the CLI. This allows users to bring their own execution environment (CI/Batch) and fulfills the vision's "Stateless" requirement incrementally.

## [0.16.1] - Module System Mismatch
**Learning:** `packages/cli` is ESM (`type: module`) but imported `packages/renderer` which lacked `type: module` in its `package.json` despite targeting ESM in `tsconfig`. This caused `SyntaxError` when using named exports like `RenderOrchestrator` in `tsx` environments.
**Action:** When developing in a monorepo with mixed CJS/ESM history, explicit `package.json` configuration (`type: module`) is critical for ensuring interoperability, even if compilation targets seem correct.

## [0.19.0] - Example Distributability
**Learning:** The examples in the repository rely on local monorepo paths (`../../../packages/*`), making them impossible to distribute directly to users via `helios init`. The "Examples" product surface is blocked by this coupling.
**Action:** Implement transformation logic in the CLI to rewrite imports and dependencies when scaffolding from an example, ensuring the user gets a standalone project.

## [0.20.0] - Distributed Plan Consistency
**Learning:** `helios render --emit-job` implemented manual chunking logic that diverged from `RenderOrchestrator.plan()`. This created a risk where distributed jobs would behave differently from local runs (e.g., audio mixing, frame ranges).
**Action:** Always delegate logic to the core domain (Renderer) rather than reimplementing it in the interface (CLI). If the API is missing, expose it, but don't duplicate the math.

## [0.20.2] - Registry Dependencies
**Learning:** The current `installComponent` implementation is flat and does not support recursive installation of registry components. This limits the ability to create composable component libraries (e.g. `Hero` -> `Button`).
**Action:** Created plan `2025-02-19-CLI-Registry-Dependencies.md` to implement recursive installation using a `registryDependencies` property in `ComponentDefinition`.

## [0.22.0] - Registry Recursion
**Learning:** Implementing recursive component installation requires careful handling of circular dependencies and file overwrite logic. The `visited` set pattern is essential to prevent infinite loops, and file existence checks prevent accidental data loss.
**Action:** When implementing graph traversal in CLI commands (like dependencies), always implement cycle detection and idempotent operations (skip if exists) to ensure robustness.

## [0.23.0] - Singleton Registry Pattern
**Learning:** `RegistryClient` was implemented as a global singleton, which prevented per-project configuration (e.g., custom registry URLs) required for the "Monetization Ready" vision.
**Action:** Created plan `2026-02-07-CLI-Configurable-Registry.md` to refactor `RegistryClient` and enable project-level registry configuration. Future services must avoid singletons when state depends on user config.
