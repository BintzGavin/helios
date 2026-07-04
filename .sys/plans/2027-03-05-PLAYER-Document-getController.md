#### 1. Context & Goal
- **Objective**: Document the `getController` method in `README.md`.
- **Trigger**: Vision gap. The `getController()` method is implemented on the `HeliosPlayer` Web Component but is missing from the public documentation.
- **Impact**: Improves API discoverability for developers needing direct access to the underlying `HeliosController`, satisfying the domain's vision of a robust and documented API.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/README.md` (Add `getController()` to the Methods section)
- **Read-Only**: `packages/player/src/index.ts` (To confirm method signature)

#### 3. Implementation Spec
- **Architecture**: N/A (Documentation update only).
- **Pseudo-Code**: N/A
- **Public API Changes**: No code changes; strictly documenting existing public API.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `cat packages/player/README.md | grep -i "getController"`
- **Success Criteria**: The `getController` method is documented in the README under the Methods section.
- **Edge Cases**: Ensure the formatting perfectly matches existing method documentation.
