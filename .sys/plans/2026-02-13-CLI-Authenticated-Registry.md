# CLI Plan: Authenticated Registry Support

## 1. Context & Goal
- **Objective:** Enable authenticated requests to private component registries by supporting `HELIOS_REGISTRY_TOKEN` and custom headers in `RegistryClient`.
- **Trigger:** Vision Gap - "Monetization Readiness" requires the ability to use paid/private registries, which is currently blocked by lack of authentication support. `RegistryClient` currently performs unauthenticated fetches only.
- **Impact:** Unlocks the ability for users to consume components from private repositories or paid services, supporting enterprise use cases and future monetization strategies without changing the core architecture.

## 2. File Inventory
- **Modify:** `packages/cli/src/registry/client.ts` (Update `RegistryClient` to handle auth headers)
- **Read-Only:** `packages/cli/src/commands/*.ts` (No changes expected as env vars are handled implicitly)

## 3. Implementation Spec
- **Architecture:**
  - Enhance `RegistryClient` to detect `process.env.HELIOS_REGISTRY_TOKEN`.
  - If the token is present, inject an `Authorization: Bearer <token>` header into all registry fetch requests.
  - Update the `RegistryClient` constructor to accept an optional `options` object for programmatic header injection (future-proofing).
  - Ensure backward compatibility for existing unauthenticated flows.

- **Pseudo-Code:**
  ```typescript
  interface RegistryClientOptions {
    headers?: Record<string, string>;
  }

  export class RegistryClient {
    private url: string | undefined;
    private headers: Record<string, string>;

    constructor(url?: string, options?: RegistryClientOptions) {
      this.url = url || process.env.HELIOS_REGISTRY_URL;
      this.headers = options?.headers || {};

      if (process.env.HELIOS_REGISTRY_TOKEN) {
        this.headers['Authorization'] = `Bearer ${process.env.HELIOS_REGISTRY_TOKEN}`;
      }
    }

    async getComponents(framework?: string): Promise<ComponentDefinition[]> {
      // ... existing cache logic ...

      if (this.url) {
        // ... abort controller setup ...
        const res = await fetch(this.url, {
          signal: controller.signal,
          headers: this.headers
        });
        // ... existing response handling ...
      }

      // ... fallback logic ...
    }
  }
  ```

- **Public API Changes:**
  - `RegistryClient` constructor signature updated to `constructor(url?: string, options?: RegistryClientOptions)`.
  - No changes to CLI command arguments (auth is handled via environment variables).

- **Dependencies:** None.

## 4. Test Plan
- **Verification:**
  1. Create a temporary test file `tests/manual/verify-registry-auth.ts`.
  2. Mock the global `fetch` function to inspect arguments.
  3. Set `process.env.HELIOS_REGISTRY_TOKEN = 'test-token'`.
  4. Instantiate `RegistryClient` and call `getComponents()`.
  5. Assert that `fetch` was called with `{ headers: { Authorization: 'Bearer test-token' } }`.
  6. Unset the env var and verify headers are not sent.
- **Success Criteria:**
  - `Authorization` header is present when env var is set.
  - Existing functionality (public registry fetch) remains broken if URL is invalid, or working if URL is valid (backward compatibility).
- **Edge Cases:**
  - Token is empty string -> No header.
  - `options.headers` contains `Authorization` -> `options` should take precedence (or merge strategy needs to be defined - simple overwrite by env var is safer for "force auth"). *Decision: Env var provides the default Bearer token, but manual options override it if provided.*
