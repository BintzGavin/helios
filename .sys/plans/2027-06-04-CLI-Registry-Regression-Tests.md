#### 1. Context & Goal
- **Objective**: Implement missing regression tests for `packages/cli/src/registry/manifest.ts`.
- **Trigger**: The CLI domain is in a "STABLE" posture (NOTHING TO DO PROTOCOL). As per AGENTS.md, fallback actions include filling regression test gaps. While `src/commands` and `src/utils` are fully tested, `src/registry/manifest.ts` lacks test coverage.
- **Impact**: Ensures that the core component registry manifest (the fallback source of truth for component scaffolding) functions correctly and returns components correctly via `findComponent()`.

#### 2. File Inventory
- **Create**: `packages/cli/src/registry/__tests__/manifest.test.ts`
- **Modify**: None
- **Read-Only**: `packages/cli/src/registry/manifest.ts`, `packages/cli/src/registry/types.ts`

#### 3. Implementation Spec
- **Architecture**: Create a Vitest test suite that verifies the core functionality of `manifest.ts`:
  - `registry` export is an array of valid `ComponentDefinition` objects.
  - `registry` contains known default components (e.g., `use-video-frame`, `timer`, `progress-bar`, `watermark`).
  - `findComponent()` correctly retrieves an existing component by name.
  - `findComponent()` returns `undefined` for a non-existent component.
- **Pseudo-Code**:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { registry, findComponent } from '../manifest.js';

  describe('registry manifest', () => {
    it('exports a valid registry array', () => {
      expect(Array.isArray(registry)).toBe(true);
      expect(registry.length).toBeGreaterThan(0);
    });

    it('contains known core components', () => {
      const names = registry.map(c => c.name);
      expect(names).toContain('use-video-frame');
      expect(names).toContain('timer');
      expect(names).toContain('progress-bar');
      expect(names).toContain('watermark');
    });

    describe('findComponent', () => {
      it('finds an existing component', () => {
        const component = findComponent('timer');
        expect(component).toBeDefined();
        expect(component?.name).toBe('timer');
        expect(component?.type).toBe('react');
      });

      it('returns undefined for non-existent component', () => {
        const component = findComponent('does-not-exist');
        expect(component).toBeUndefined();
      });
    });
  });
  ```
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: `npm run test -w packages/cli`
- **Success Criteria**: Vitest executes the new `manifest.test.ts` test suite and all tests pass.
- **Edge Cases**: Unknown component names must return `undefined` gracefully.
