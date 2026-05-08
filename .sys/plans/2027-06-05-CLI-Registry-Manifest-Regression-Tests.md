#### 1. Context & Goal
- **Objective**: Implement unit tests for `packages/cli/src/registry/manifest.ts` to ensure the fallback registry component definitions and retrieval logic are reliable.
- **Trigger**: Identified as a fallback task under the NOTHING TO DO PROTOCOL due to a lack of test coverage for the `manifest.ts` file in an otherwise stable domain.
- **Impact**: Provides 100% test coverage for the registry core structural files, preventing regressions when adding or modifying core components.

#### 2. File Inventory
- **Create**: `packages/cli/src/registry/__tests__/manifest.test.ts` (new test file for manifest logic).
- **Modify**: None.
- **Read-Only**: `packages/cli/src/registry/manifest.ts`, `packages/cli/src/registry/types.ts`.

#### 3. Implementation Spec
- **Architecture**:
  - Use `vitest` to define a test suite for `manifest.ts`.
  - Validate the `registry` array: verify it contains the expected core components (`use-video-frame`, `timer`, `progress-bar`, `watermark`).
  - Validate that component objects conform to `ComponentDefinition` (having names, types, and files with content).
  - Test the `findComponent` function to ensure it correctly returns a component by name, and returns `undefined` for a non-existent name.
- **Pseudo-Code**:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { registry, findComponent } from '../manifest.js';

  describe('Registry Manifest', () => {
    it('should export a registry array with default components', () => {
      expect(registry.length).toBeGreaterThan(0);
      const names = registry.map(c => c.name);
      expect(names).toContain('use-video-frame');
      expect(names).toContain('timer');
    });

    it('findComponent should return the correct component', () => {
      const comp = findComponent('timer');
      expect(comp).toBeDefined();
      expect(comp?.name).toBe('timer');
    });

    it('findComponent should return undefined for unknown components', () => {
      const comp = findComponent('does-not-exist');
      expect(comp).toBeUndefined();
    });
  });
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run test -- packages/cli/src/registry/__tests__/manifest.test.ts` from the root directory.
- **Success Criteria**: All tests pass.
- **Edge Cases**: Unknown component names returning `undefined`.
