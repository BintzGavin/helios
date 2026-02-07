# 2026-02-18 - Bundle Agent Skills in Studio Package

## 1. Context & Goal
- **Objective**: Bundle the `.agents/skills/helios` directory into the `@helios-project/studio` package distribution and update discovery logic to ensure Agent Skills are available to end-users.
- **Trigger**: The Studio Assistant relies on `SKILL.md` files for its RAG system, but these files are currently located in the repo root (`.agents/`) and are not distributed with the npm package. End-users running `npx helios studio` see no skills in the Assistant.
- **Impact**: Enables the "AI-Assisted Development" vision by providing intelligent, context-aware help to agents using Helios, regardless of how the Studio is installed.

## 2. File Inventory
- **Create**: None.
- **Modify**:
  - `packages/studio/package.json`: Add `build:skills` script to copy skills to `dist/skills`.
  - `packages/studio/bin/helios-studio.js`: Update `skillsRoot` resolution to point to `dist/skills`.
  - `packages/cli/src/commands/studio.ts`: Update `skillsRoot` resolution to fall back to the Studio package's `dist/skills` if local skills are missing.
- **Read-Only**:
  - `packages/studio/src/server/plugin.ts`
  - `.agents/skills/helios`

## 3. Implementation Spec
- **Architecture**:
  - The build process for `packages/studio` will include a step to copy the `.agents/skills/helios` directory to `packages/studio/dist/skills`.
  - The runtime logic in both the standalone binary (`helios-studio`) and the CLI command (`helios studio`) will be updated to locate these bundled skills relative to the `dist` directory.
- **Pseudo-Code**:
  - In `packages/studio/package.json`:
    - Add script `"build:skills": "mkdir -p dist/skills && cp -r ../../.agents/skills/helios/* dist/skills/"`.
    - Update `"build"` to include `"npm run build:skills"`.
  - In `packages/studio/bin/helios-studio.js`:
    - Calculate `skillsRoot` as `path.resolve(distPath, 'skills')`.
    - Pass `skillsRoot` to `studioApiPlugin`.
  - In `packages/cli/src/commands/studio.ts`:
    - Update `skillsRoot` resolution:
      - First check if local `../skills` exists (dev/monorepo case).
      - If not, check `path.resolve(studioDist, 'skills')` (prod/npm case).
      - Pass the resolved path to `studioApiPlugin`.
- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  1. Run `npm run build -w packages/studio` and verify `packages/studio/dist/skills` exists and contains markdown files.
  2. Run `node packages/studio/bin/helios-studio.js` and verify it logs "Skills Root: .../dist/skills".
  3. (If possible) Run `helios studio` (cli) and verify it logs "Skills Root: .../dist/skills" (assuming local dev environment simulates prod correctly).
- **Success Criteria**:
  - `dist/skills` directory contains `SKILL.md` files after build.
  - Studio server initializes with correct `skillsRoot` pointing to the bundled skills.
- **Edge Cases**:
  - Development mode (monorepo) vs Production mode (npm install). The CLI update handles both by prioritizing local (if in monorepo CLI dev) or falling back to Studio package.
