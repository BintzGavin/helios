#### 1. Context & Goal
- **Objective**: Document missing reflected properties and methods in `README.md`.
- **Trigger**: The properties `interactive`, `src`, `autoplay`, `loop`, `controls`, `poster`, `preload`, and `sandbox` are exposed as getters/setters in `index.ts` reflecting their respective attributes, but they are missing from the `### Properties` list in `README.md`. Similarly, the methods `getController`, `handleAudioTrackEnabledChange`, `handleVideoTrackSelectedChange`, `handleTrackModeChange` are missing from the `### Methods` list.
- **Impact**: Ensures complete and accurate documentation of the public API surface for developers.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/README.md` (Add missing properties and methods to the list).
- **Read-Only**: `packages/player/src/index.ts`

#### 3. Implementation Spec
- **Architecture**: Documentation update to maintain API parity visibility.
- **Pseudo-Code**: N/A
- **Public API Changes**: No code changes, only documentation.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `grep -E "interactive|src|autoplay|loop|controls|poster|preload|sandbox|getController" packages/player/README.md`
- **Success Criteria**: The `README.md` file contains the missing properties in the `### Properties` section and missing methods in `### Methods` section.
- **Edge Cases**: Ensure the formatting perfectly matches the existing properties list.
