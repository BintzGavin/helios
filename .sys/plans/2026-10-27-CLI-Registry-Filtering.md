# 2026-10-27-CLI-Registry-Filtering.md

## 1. Context & Goal
- **Objective**: Update `RegistryClient` to support cross-framework component sharing by allowing `vanilla` components to be discovered and installed in framework-specific projects (e.g., React, Vue).
- **Trigger**: Vision gap. The current strict filtering (`c.type === framework`) prevents reusing framework-agnostic utility components (like `use-video-frame` logic or math helpers) in specific projects, violating the "Component Economy" vision.
- **Impact**: Enables a richer ecosystem where utility libraries are written once in Vanilla JS/TS and consumed by any framework. Unblocks dependency resolution for components that rely on shared vanilla utilities.

## 2. File Inventory
- **Modify**: `packages/cli/src/registry/client.ts` (Update filtering and finding logic)
- **Modify**: `packages/cli/src/registry/__tests__/client.test.ts` (Add test cases for mixed-framework registry)

## 3. Implementation Spec
- **Architecture**:
  - `getComponents(framework)` will now return components that match `framework` OR `type === 'vanilla'`.
  - `findComponent(name, framework)` will be updated to prioritize the requested `framework` match over a `vanilla` match if both exist with the same name.
- **Pseudo-Code**:
  ```typescript
  // client.ts

  async getComponents(framework?: string) {
    // ... fetch logic ...
    if (framework) {
      // Allow specific framework OR vanilla
      return components.filter(c => c.type === framework || c.type === 'vanilla');
    }
    return components;
  }

  async findComponent(name: string, framework?: string) {
    const components = await this.getComponents(framework);
    const matches = components.filter(c => c.name === name);

    if (matches.length === 0) return undefined;

    // If multiple matches (e.g. React & Vanilla versions), prioritize framework
    if (framework) {
      const exact = matches.find(c => c.type === framework);
      if (exact) return exact;
    }

    return matches[0];
  }
  ```
- **Public API Changes**: None (Internal logic change in `RegistryClient`).
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run `vitest` in `packages/cli` to verify new test cases.
- **Test Cases**:
  - Mock registry with: `[CompReact (react), CompVue (vue), CompVanilla (vanilla), CompDual (react), CompDual (vanilla)]`.
  - `getComponents('react')` -> returns `CompReact`, `CompVanilla`, `CompDual (react)`, `CompDual (vanilla)`.
  - `getComponents('vue')` -> returns `CompVue`, `CompVanilla`.
  - `findComponent('CompVanilla', 'react')` -> returns `CompVanilla`.
  - `findComponent('CompVue', 'react')` -> returns `undefined`.
  - `findComponent('CompDual', 'react')` -> returns `CompDual (react)`.
