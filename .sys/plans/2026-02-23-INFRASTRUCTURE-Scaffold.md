# INFRASTRUCTURE Scaffolding Spec

## 1. Context & Goal
- **Objective**: Initialize the `packages/infrastructure` package with standard configuration and directory structure.
- **Trigger**: The `packages/infrastructure` domain is defined in `AGENTS.md` but does not exist in the codebase.
- **Impact**: Establishes the home for distributed rendering logic, cloud adapters, and worker orchestration, enabling V2 infrastructure development.

## 2. File Inventory
- **Create**:
  - `packages/infrastructure/package.json`: Package configuration.
  - `packages/infrastructure/tsconfig.json`: TypeScript configuration.
  - `packages/infrastructure/README.md`: Domain documentation.
  - `packages/infrastructure/src/index.ts`: Entry point.
  - `packages/infrastructure/tests/placeholder.test.ts`: Initial test file.

## 3. Implementation Spec

### Architecture
- Standard Monorepo Package structure matching `core` and `renderer`.
- ESM-first (`"type": "module"`).
- TypeScript-based.

### Pseudo-Code / Configuration Details

#### `package.json`
- **Name**: `@helios-project/infrastructure`
- **Version**: `0.0.1`
- **Type**: `module`
- **Exports**: Point `.` to `./dist/index.js` and types to `./dist/index.d.ts`.
- **Scripts**:
  - `build`: `tsc`
  - `dev`: `tsc -w`
  - `test`: `vitest`
- **Dependencies**: None initially.
- **DevDependencies**: `typescript`, `vitest` (versions matching root).

#### `tsconfig.json`
- Extends `../../tsconfig.json`.
- `compilerOptions`:
  - `outDir`: `./dist`
  - `rootDir`: `./src`
  - `composite`: true
- `include`: `["src/**/*"]`
- `exclude`: `["src/**/*.test.ts"]`

#### `src/index.ts`
- Export a constant `INFRASTRUCTURE_VERSION` matching the package version.
- Export a placeholder function `initInfrastructure()` that logs a message.

#### `README.md`
- Title: `Helios Infrastructure`
- Description: Distributed rendering orchestration and cloud execution adapters.
- Status: Experimental / Incubating.

## 4. Test Plan
- **Verification**:
  1. Run `npm install` in root to link the new workspace.
  2. Run `npm run build -w packages/infrastructure`.
  3. Run `npm run test -w packages/infrastructure`.
- **Success Criteria**:
  - Build command produces `dist/index.js` and `dist/index.d.ts`.
  - Test command passes (1 test).
  - Package is recognized by root `package.json` workspaces (already `packages/*`).
- **Edge Cases**:
  - Ensure no circular dependencies with other packages (none introduced here).
