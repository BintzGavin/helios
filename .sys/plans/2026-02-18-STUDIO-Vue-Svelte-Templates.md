# 📋 STUDIO: Implement Vue & Svelte Composition Templates

## 1. Context & Goal
- **Objective**: Add Vue and Svelte templates to the "Create Composition" feature in Helios Studio.
- **Trigger**: Vision gap - README promises support for "React, Vue, Svelte", but Studio currently only supports Vanilla JS and React.
- **Impact**: Unlocks the ability for Vue and Svelte developers to easily scaffold new compositions within Studio, fulfilling the framework-agnostic promise.

## 2. File Inventory
- **Create**:
  - `packages/studio/src/server/templates/vue.ts`: Vue template definition.
  - `packages/studio/src/server/templates/svelte.ts`: Svelte template definition.
- **Modify**:
  - `packages/studio/src/server/templates/index.ts`: Register and export the new templates.
- **Read-Only**:
  - `packages/studio/src/server/templates/types.ts`: To ensure type compliance.
  - `examples/vue-dom-animation/src/`: For reference.
  - `examples/svelte-dom-animation/src/`: For reference.

## 3. Implementation Spec
- **Architecture**:
  - Extend the existing `Template` pattern found in `vanilla.ts` and `react.ts`.
  - Each template will generate a standard file structure mirroring the `examples/` directory best practices.
- **Vue Template (`vue.ts`)**:
  - Implement `vueTemplate: Template`.
  - `generate(name)` returns array of files:
    - `composition.html`: HTML entry point importing `./main.ts`.
    - `main.ts`: Imports `createApp` from `vue` and mounts `App.vue`.
    - `App.vue`: Uses `<script setup>`, initializes `Helios`, and uses `useVideoFrame`.
    - `composables/useVideoFrame.ts`: Implements the Vue-specific frame subscription hook using `ref` and `onUnmounted`.
- **Svelte Template (`svelte.ts`)**:
  - Implement `svelteTemplate: Template`.
  - `generate(name)` returns array of files:
    - `composition.html`: HTML entry point importing `./main.ts`.
    - `main.ts`: Imports `mount` from `svelte` and mounts `App.svelte` to `#app`.
    - `App.svelte`: Uses `createHeliosStore` and binds styles to `$heliosStore`.
    - `lib/store.ts`: Implements the Svelte-specific store using `readable`.
- **Public API Changes**:
  - No interface changes, but the `template` argument in `createComposition` will now support `'vue'` and `'svelte'` values.

## 4. Test Plan
- **Verification**:
  - Run `npx helios studio` in a project with `vue` and `svelte` installed.
  - Open the "Create Composition" modal.
  - Verify "Vue" and "Svelte" options appear.
  - Create a Vue composition and verify it renders (green rotating box).
  - Create a Svelte composition and verify it renders (blue rotating box).
- **Success Criteria**:
  - Files are generated correctly.
  - Imports use `@helios-project/core`.
  - No syntax errors in generated code.
- **Edge Cases**:
  - Missing dependencies in user project (expected to fail at runtime).
  - Naming conflicts (handled by existing logic).
