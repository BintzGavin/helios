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
