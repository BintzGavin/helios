#### 1. Context & Goal
- **Objective**: Track installed registry components in `helios.config.json` to enable inventory management.
- **Trigger**: Vision Gap (Shadcn-style registry requires tracking) and Journal Entry [0.9.1].
- **Impact**: Enables future features like `helios update` and `helios list`, and gives users visibility into what components are installed.

#### 2. File Inventory
- **Modify**: `packages/cli/src/utils/config.ts` (Update `HeliosConfig` interface and `DEFAULT_CONFIG`)
- **Modify**: `packages/cli/src/utils/install.ts` (Update `installComponent` to save installed component to config)
- **Modify**: `packages/cli/src/commands/init.ts` (Implicitly affected via `DEFAULT_CONFIG`, verify behavior)
- **Read-Only**: `packages/cli/src/registry/types.ts`

#### 3. Implementation Spec
- **Architecture**: Extend `HeliosConfig` with a `dependencies` record. Update the config file post-installation of any component.
- **Pseudo-Code**:
  - In `config.ts`: Add `dependencies?: Record<string, string>` to interface and `dependencies: {}` to `DEFAULT_CONFIG`.
  - In `install.ts`:
    - After files are written:
      - Read `helios.config.json` (already loaded as `config`).
      - Initialize `config.dependencies` if missing.
      - Set `config.dependencies[componentName] = 'latest'`.
      - Write `helios.config.json` back to disk using `JSON.stringify`.
- **Public API Changes**:
  - `helios.config.json` will now include a `dependencies` field.
  - `HeliosConfig` interface updated.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - `helios init --yes` -> check `helios.config.json` has `"dependencies": {}`.
  - `helios add timer` -> check `helios.config.json` has `"dependencies": { "timer": "latest" }`.
  - `helios add watermark --no-install` -> check `helios.config.json` has both.
- **Success Criteria**: `helios.config.json` accurately reflects installed components.
- **Edge Cases**:
  - `helios.config.json` missing (error).
  - Config exists but lacks `dependencies` (should be added).
