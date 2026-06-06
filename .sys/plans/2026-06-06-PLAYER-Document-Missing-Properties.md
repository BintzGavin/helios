#### 1. Context & Goal
- **Objective**: Document missing `src`, `autoplay`, `loop`, `controls`, `poster`, `preload`, `sandbox`, and `interactive` properties on the `HeliosPlayer` class.
- **Trigger**: Discovered that properties exposed on the `HeliosPlayer` class to reflect attributes (`src`, `autoplay`, `loop`, `controls`, `poster`, `preload`, `sandbox`, `interactive`) are omitted from the `README.md` Properties section.
- **Impact**: Improves API parity visibility and ensures documentation accurately reflects standard media API property implementations.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/README.md`
- **Read-Only**: `packages/player/src/index.ts`

#### 3. Implementation Spec
- **Architecture**: Append the missing properties to the "Properties" section of `packages/player/README.md` in a format consistent with the existing documentation.
- **Pseudo-Code**:
  - Locate `### Properties` section in `packages/player/README.md`.
  - Add missing properties (`src`, `autoplay`, `loop`, `controls`, `poster`, `preload`, `sandbox`, `interactive`) with appropriate types and descriptions. Ensure descriptions clarify that these properties reflect their respective attributes.
- **Public API Changes**: No functional changes. Documentation updates only.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**: `README.md` successfully updated with all missing properties, and the project builds without issues.
- **Edge Cases**: None.
