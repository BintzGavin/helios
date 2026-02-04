# CLI: Implement Remote Registry Fetching

#### 1. Context & Goal
- **Objective**: Decouple the component registry from the CLI binary by implementing remote registry fetching.
- **Trigger**: The current registry is hardcoded in `manifest.ts`, which prevents dynamic updates and community contributions ("Shadcn-style" registry requirement).
- **Impact**: Enables the CLI to fetch components from a remote source, allowing the ecosystem to grow independently of CLI releases.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/registry/api.ts` (Registry fetching and caching logic)
- **Modify**:
  - `packages/cli/src/registry/types.ts` (Export registry types for API use)
  - `packages/cli/src/utils/config.ts` (Add `registryUrl` to `HeliosConfig`)
  - `packages/cli/src/utils/install.ts` (Accept `ComponentDefinition` instead of looking it up)
  - `packages/cli/src/commands/add.ts` (Use `fetchRegistry` and pass definition to install)
  - `packages/cli/src/commands/components.ts` (Use `fetchRegistry` to list items)
- **Read-Only**: `packages/cli/src/registry/manifest.ts` (Used as fallback/default)

#### 3. Implementation Spec
- **Architecture**:
  - Introduce a `fetchRegistry(url?: string)` function in `api.ts`.
  - It checks for a `--registry` flag, then `helios.config.json`, then env var, then falls back to `manifest.ts`.
  - Uses `fetch` (Node 18+) to retrieve the JSON.
  - Validates the schema.
- **Pseudo-Code**:
  ```typescript
  // registry/api.ts
  async function fetchRegistry(urlOverride?: string): Promise<ComponentDefinition[]> {
    const url = urlOverride || config.registryUrl || DEFAULT_REGISTRY_URL;
    try {
      if (url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch');
        return await res.json();
      }
    } catch (e) {
      // warn and fallback
    }
    return localRegistry;
  }
  ```
- **Public API Changes**:
  - `helios add` and `helios components` accept new `--registry <url>` flag.
  - `helios.config.json` supports `registryUrl` field.
- **Dependencies**: None (uses native `fetch`).

#### 4. Test Plan
- **Verification**:
  - Run `helios components` (verifies fallback to local works).
  - Run `helios add timer` (verifies fallback install works).
  - (Manual) Run `helios components --registry <invalid-url>` (verify fallback/error handling).
- **Success Criteria**:
  - Existing commands continue to work using the local manifest (fallback).
  - Code structure supports remote fetching for future V2 platform expansion.
