## STUDIO v0.116.2
- ✅ Completed: Schema Validation - Implemented visual validation feedback in the Studio Props Editor to enforce schema constraints (pattern, min/max) and guide users using a unified `validateValue` helper.

## STUDIO v0.116.1
- ✅ Verified: Regression Test - Confirmed Asset Move backend API and Studio UI stability via verification scripts (`verify-asset-move.ts`, `verify-ui.ts`).

## STUDIO v0.116.0
- ✅ Completed: Asset Move - Implemented drag-and-drop support for moving assets and folders within the Assets Panel, backed by a new `moveAsset` API.

## STUDIO v0.115.0
- ✅ Completed: WebCodecs Preference - Added `webCodecsPreference` configuration to Studio Renders Panel, allowing users to select Hardware, Software, or Disabled modes for rendering.

## STUDIO v0.114.2
- ✅ Completed: React Components Example - Added documentation and verified `react-components-demo` example.

## STUDIO v0.114.1
- ✅ Verified: Regression Test - Validated Studio UI functionality via Playwright script (`scripts/verify-ui.ts`), confirming critical UI elements (Timeline, Renders Panel) load correctly.

## STUDIO v0.114.0
- ✅ Verified: Registry Filtering Support - Confirmed that Studio supports cross-framework component discovery (e.g., vanilla components in React projects) via updated CLI logic.

## STUDIO v0.113.1
- ✅ Completed: CLI Init Examples Fix - Replaced `degit` with `giget` in `helios init --example` to ensure reliable template downloading and added comprehensive tests.

## STUDIO v0.113.0
- ✅ Completed: CLI Components Command Enhanced - Verified implementation of `helios components` command with comprehensive unit tests and updated Studio documentation.

## STUDIO v0.112.0
- ✅ Completed: CLI Registry Filtering - Updated `RegistryClient` to support cross-framework component sharing by allowing `vanilla` components to be discovered and installed in framework-specific projects.

## STUDIO v0.111.0
- ✅ Completed: CLI Registry Auth - Enabled authentication for private component registries via environment variable `HELIOS_REGISTRY_TOKEN`.

## STUDIO v0.110.0
- ✅ Completed: Distributed Rendering Example - Created `examples/distributed-rendering` demonstrating the workflow for generating and executing distributed render jobs.

## STUDIO v0.109.0
- ✅ Verified: CLI Diff Command - Verified implementation of `helios diff` command and updated documentation in Studio README.

## STUDIO v0.108.1
- ✅ Verified: Refine CLI Component Removal - Verified `helios remove` command supports interactive file deletion, `--yes` flag, and `--keep-files` flag.

## STUDIO v0.108.0
- ✅ Completed: Enhance MCP Server - Implemented MCP resources (documentation, assets, components) and tools (install/update/uninstall components) for agent integration.

## STUDIO v0.107.3
- ✅ Completed: Documentation Maintenance - Updated Studio documentation to document `helios preview` command usage.

## STUDIO v0.107.2
- ✅ Verified: Renders Panel Tests - Implemented comprehensive unit tests for `RendersPanel`, covering interactions, states, and context integration.

## STUDIO v0.107.1
- ✅ Completed: Portable Job Paths - Updated `getRenderJobSpec` to generate relative paths for input, output, and chunks, ensuring distributed render jobs are portable across environments.

## STUDIO v0.107.0
- ✅ Completed: Export Job Spec - Implemented "Export Job Spec" functionality in Renders Panel to generate distributed render job JSON files for cloud execution.

## STUDIO v0.106.0
- ✅ Completed: Configurable Example Registry (CLI) - Implemented `--repo` flag for `helios init` command, enabling scaffolding from custom GitHub repositories.

## STUDIO v0.105.1
- ✅ Verified: Components Panel Tests - Implemented comprehensive unit tests for ComponentsPanel covering loading, listing, install, update, and remove flows.

## STUDIO v0.105.0
- ✅ Completed: Component Management - Implemented ability to remove and update components from the Studio UI, adding corresponding CLI hooks and backend API endpoints.

## STUDIO v0.104.3
- ✅ Completed: Preview Command - Implemented `helios preview` command to serve production builds locally for verification.

## STUDIO v0.104.2
- ✅ Completed: CompositionsPanel Tests - Implemented unit tests for CompositionsPanel covering CRUD and filtering.

## STUDIO v0.104.1
- ✅ Verified: Agent Skills Tests - Added unit tests for agent skills documentation logic and synced package version.

## STUDIO v0.104.0
- ✅ Completed: CLI Build Command - Implemented `helios build` command to generate a deployable player harness.

## STUDIO v0.103.2
- ✅ Fixed: Dependency Mismatch - Updated `packages/studio/package.json` to align `core` dependency with workspace version (`^5.11.0`) and fixed verification pipeline.

## STUDIO v0.103.1
- ✅ Completed: Refine Agent Skills - Prepend "Agent Skill: " to skill titles in documentation to distinguish them from standard package docs.

## STUDIO v0.103.0
- ✅ Completed: CLI Update Command - Implemented `helios update` command in CLI to update/reinstall components with overwrite support, ensuring users can refresh component code.
