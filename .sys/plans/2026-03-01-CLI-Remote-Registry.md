# Plan: CLI Remote Registry Support

#### 1. Context & Goal
- **Objective**: Decouple the component registry from the CLI binary by enabling remote fetching of component definitions.
- **Trigger**: The V2 vision mandates a "Shadcn-style" registry where components are distributed as source. The current implementation uses a hardcoded `manifest.ts` file, which prevents dynamic updates.
- **Impact**: Allows the registry to grow independently of the CLI release cycle and supports custom/private registries via URL configuration.

#### 2. File Inventory
- **Create**: `packages/cli/src/registry/client.ts`
  - Purpose: Implements `RegistryClient` class to handle fetching and fallback logic.
- **Modify**: `packages/cli/src/utils/install.ts`
  - Change: Replace direct `manifest.ts` imports with `RegistryClient` usage.
- **Modify**: `packages/cli/src/commands/components.ts`
  - Change: Replace direct `manifest.ts` imports with `RegistryClient` usage.
- **Read-Only**: `packages/cli/src/registry/manifest.ts`
  - Purpose: Retained as a fallback for offline use or network failures.

#### 3. Implementation Spec

**Architecture**
- **RegistryClient**: A class responsible for resolving component definitions.
  - **Inputs**: Optional `registryUrl` (defaults to environment variable `HELIOS_REGISTRY_URL` or internal default).
  - **Mechanism**:
    1. Attempts to fetch `index.json` from the registry URL.
    2. On success, maps the JSON to `ComponentDefinition[]`.
    3. On failure (or if URL unset), falls back to the local `registry/manifest.ts`.
- **Caching**: Simple in-memory caching for the duration of the command execution.

**Pseudo-Code**

```typescript
// packages/cli/src/registry/client.ts

import { registry as localRegistry } from './manifest.js';
import { ComponentDefinition } from './types.js';

export class RegistryClient {
  private url: string | undefined;

  constructor(url?: string) {
    this.url = url || process.env.HELIOS_REGISTRY_URL;
  }

  async getComponents(): Promise<ComponentDefinition[]> {
    if (this.url) {
      try {
        const res = await fetch(this.url);
        if (res.ok) {
           return await res.json();
        }
      } catch (e) {
        console.warn('Failed to fetch remote registry, falling back to local.');
      }
    }
    return localRegistry;
  }

  async findComponent(name: string): Promise<ComponentDefinition | undefined> {
    const components = await this.getComponents();
    return components.find(c => c.name === name);
  }
}

export const defaultClient = new RegistryClient();
```

**Public API Changes**
- `helios add` and `helios components` will now be async in their data retrieval phase (internal implementation detail, but affects flow).
- New Environment Variable: `HELIOS_REGISTRY_URL` supported.

**Dependencies**
- None.

#### 4. Test Plan
- **Verification**:
  1. Run `helios components` - Verify it lists default components (fallback path).
  2. Run `HELIOS_REGISTRY_URL=http://localhost:9999/bad-url helios components` - Verify it warns but falls back to local.
- **Success Criteria**: CLI continues to work identical to before, but `manifest.ts` is no longer the *only* source of truth.
- **Edge Cases**: Network timeouts, invalid JSON response.
