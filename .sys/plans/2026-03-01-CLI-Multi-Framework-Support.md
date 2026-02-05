# 2026-03-01-CLI-Multi-Framework-Support

#### 1. Context & Goal
- **Objective**: Update `helios init` to support scaffolding projects for React, Vue, Svelte, and Vanilla, and ensure `helios studio` supports their configurations.
- **Trigger**: The current CLI is React-centric (`helios init` only scaffolds React, and `helios studio` ignores user config by setting `configFile: false`), limiting adoption for other frameworks supported by Helios Core.
- **Impact**: Enables broader adoption of Helios V2 as a framework-agnostic platform and prepares the registry for future multi-framework component support.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/templates/react.ts` (Refactored from basic)
  - `packages/cli/src/templates/vue.ts` (New)
  - `packages/cli/src/templates/svelte.ts` (New)
  - `packages/cli/src/templates/vanilla.ts` (New)
- **Modify**:
  - `packages/cli/src/commands/init.ts` (Add framework selection prompt)
  - `packages/cli/src/utils/config.ts` (Add `framework` field to config schema)
  - `packages/cli/src/commands/studio.ts` (Enable loading of user `vite.config.ts`)
  - `packages/cli/src/templates/basic.ts` (Deprecate or remove in favor of `react.ts`)
- **Read-Only**:
  - `packages/cli/src/index.ts`
  - `examples/` (For reference)

#### 3. Implementation Spec
- **Architecture**:
  - `init` command uses `prompts` or `readline` to ask for framework preference.
  - Templates are stored as dictionaries of filenames to content strings (pattern established in `basic.ts`).
  - `studio` command removes `configFile: false` to allow Vite to resolve `vite.config.ts` from `process.cwd()`.
  - `helios.config.json` stores the selected framework to guide future CLI operations (like component adding).
- **Pseudo-Code**:
  ```typescript
  // commands/init.ts
  const framework = await ask('Select framework', ['react', 'vue', 'svelte', 'vanilla']);
  const template = getTemplate(framework);
  writeTemplateFiles(template);
  writeConfig({ ..., framework });
  ```
  ```typescript
  // commands/studio.ts
  await createServer({
     root: process.cwd(),
     // configFile: false, // REMOVED to allow loading user config
     ...
  });
  ```
- **Public API Changes**:
  - `helios.config.json` now includes optional `framework` property (`'react' | 'vue' | 'svelte' | 'vanilla'`).
  - `helios init` interaction flow changes (adds prompt).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  1. Run `helios init` in a clean directory.
  2. Select `vue`.
  3. Verify `package.json` has `vue` and `@vitejs/plugin-vue`.
  4. Verify `helios.config.json` has `framework: "vue"`.
  5. Run `npm install` and `helios studio`.
  6. Verify Studio launches and renders the Vue composition (requires `vite.config.ts` to be loaded).
- **Success Criteria**:
  - `helios init` supports 4 options.
  - Generated projects run with `helios studio`.
- **Edge Cases**:
  - Running `init` with `-y` (defaults to React for backward compatibility).
  - Existing projects without `framework` in config (should be handled gracefully).
