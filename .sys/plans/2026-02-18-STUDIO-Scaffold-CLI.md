# 📋 STUDIO: Scaffold CLI Package

## 1. Context & Goal
- **Objective**: Initialize the `@helios-project/cli` package to serve as the unified entry point (`npx helios`).
- **Trigger**: The Vision requires `npx helios studio`, but no CLI package exists.
- **Impact**: Enables users to run the Studio and future commands (e.g., render) via a standard CLI interface.

## 2. File Inventory
- **Create**:
    - `packages/cli/package.json`
    - `packages/cli/tsconfig.json`
    - `packages/cli/bin/helios.js`
    - `packages/cli/src/index.ts`
    - `packages/cli/src/commands/studio.ts`

## 3. Implementation Spec
- **Architecture**:
    - **Stack**: Node.js, TypeScript, Commander.js.
    - **Pattern**: The CLI acts as a dispatcher. The `studio` command will eventually delegate to `@helios-project/studio`.
    - **Module System**: ESM (`"type": "module"`).
- **Dependencies**:
    - `commander`, `chalk`.

### `packages/cli/package.json`
- **Name**: `@helios-project/cli`
- **Version**: `0.0.1`
- **Type**: `module`
- **Bin**: `{ "helios": "./bin/helios.js" }`
- **Scripts**:
    - `build`: `tsc`
    - `dev`: `tsc -w`
- **Dependencies**:
    - `commander`: `^13.1.0`
    - `chalk`: `^5.4.1`
    - `typescript`: `^5.0.0`

### `packages/cli/tsconfig.json`
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "composite": true
  },
  "include": ["src"]
}
```

### `packages/cli/bin/helios.js`
- **Logic**:
    - `#!/usr/bin/env node`
    - `import('../dist/index.js')` (ESM import).

### `packages/cli/src/index.ts`
- **Logic**:
    - Initialize `commander` with `program`.
    - Import `registerStudioCommand`.
    - `registerStudioCommand(program)`.
    - `program.parse(process.argv)`.

### `packages/cli/src/commands/studio.ts`
- **Logic**:
    - Export `registerStudioCommand(program: Command)`.
    - `program.command('studio').description('Launch the Helios Studio').action(async () => { console.log('Starting Studio...'); })`.

## 4. Test Plan
- **Verification**:
    1. Run `npm install` (to link workspace).
    2. Build the CLI: `npm run build -w packages/cli`.
    3. Run `./packages/cli/bin/helios.js studio`.
- **Success Criteria**:
    - The command prints "Starting Studio...".
