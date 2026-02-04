# 2025-05-06-CLI-Project-Scaffolding.md

#### 1. Context & Goal
- **Objective**: Expand the `helios init` command to scaffold a complete project directory structure (package.json, Vite config, entry points) when run in an empty directory.
- **Trigger**: `AGENTS.md` specifies `helios init` should "scaffold new Helios projects", but currently it only generates a configuration file. This creates friction for new users who must manually setup the build environment.
- **Impact**: drastically improves the "Zero to One" experience for new users, ensuring they start with a correctly configured environment compatible with `helios studio` and `helios render`.

#### 2. File Inventory
- **Create**: `packages/cli/src/templates/basic.ts` (Contains template file strings)
- **Modify**: `packages/cli/src/commands/init.ts` (Add scaffolding logic)
- **Read-Only**: `packages/cli/package.json`

#### 3. Implementation Spec
- **Architecture**:
  - Introduce a lightweight template system in `src/templates/basic.ts` exporting a dictionary of filenames and content.
  - Update `init` command to check for existing project files (`package.json`).
  - If missing, prompt the user: "No package.json found. Do you want to scaffold a new project?"
  - If yes, write the template files to disk.
  - Pre-fill the `helios.config.json` generation with values matching the template (e.g. `src/components`).
- **Pseudo-Code**:
  - **`src/templates/basic.ts`**:
    - Export `BASIC_TEMPLATE` object:
      - `package.json`: content with dependencies (`react`, `@helios-project/core`, `vite`).
      - `vite.config.ts`: basic React config.
      - `tsconfig.json`: standard TS config.
      - `index.html`: mounts `src/index.tsx`.
      - `src/index.tsx`: initializes `Helios` and mounts root component.
      - `src/components/HelloWorld.tsx`: simple sample component.
  - **`src/commands/init.ts`**:
    - Import `BASIC_TEMPLATE`.
    - In `action` handler:
      - Check `fs.existsSync('package.json')`.
      - If false:
        - Ask "Initialize new project structure?" (Y/n).
        - If yes:
          - Loop through `BASIC_TEMPLATE` keys.
          - Ensure directory exists (`path.dirname`).
          - `fs.writeFileSync`.
          - Log "Created <file>".
          - Set `shouldSkipConfigPrompt = true`.
          - Set `configDefaults` to match template structure.
      - Proceed to `helios.config.json` creation (using defaults if scaffolded).
      - If scaffolded, log "Project created! Run 'npm install' to get started.".
- **Public API Changes**: `helios init` now supports interactive project scaffolding.
- **Dependencies**: No new runtime dependencies. Uses existing `fs`, `path`, `readline`.

#### 4. Test Plan
- **Verification**:
  1. Build CLI: `npm run build -w packages/cli`.
  2. Create clean temp dir: `mkdir temp_scaffold && cd temp_scaffold`.
  3. Run: `node ../packages/cli/bin/helios.js init`.
  4. Answer "Y" to scaffolding.
  5. Verify `package.json`, `vite.config.ts`, `src/index.tsx` exist.
  6. Verify `helios.config.json` exists and points to `src/components`.
  7. Run: `node ../packages/cli/bin/helios.js init` in a dir with `package.json`.
  8. Verify it skips scaffolding prompt and asks about config.
- **Success Criteria**:
  - A working project structure is created.
  - `package.json` contains valid JSON.
  - `helios studio` (if dependencies installed) would ideally work.
- **Edge Cases**:
  - Directory partially populated (e.g. has `src` but no `package.json`).
  - Write permission errors.
