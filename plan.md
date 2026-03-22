1. **Context & Goal**
   - **Objective**: Add `canvas-selector`, `playsinline`, and `crossorigin` to `observedAttributes` in `packages/player/src/index.ts`.
   - **Trigger**: The player implemented these attributes (e.g., `crossorigin` added in v0.41.0, `canvas-selector` documented), but they are missing from `observedAttributes`, preventing them from being correctly observed for changes.
   - **Impact**: Ensures that when these attributes change, the component can react properly if needed, bringing the component behavior into alignment with its implementation and standard Media Element parity.

2. **File Inventory**
   - **Create**: `/.sys/plans/2026-03-22-PLAYER-Fix-Observed-Attributes.md`
   - **Read-Only**: `packages/player/src/index.ts`

3. **Implementation Spec**
   - **Architecture**: Standard Web Component `observedAttributes` pattern.
   - **Pseudo-Code**:
     - Add `"canvas-selector"`, `"playsinline"`, and `"crossorigin"` to the array returned by `static get observedAttributes()`.
   - **Public API Changes**: No structural changes, just additional observed attributes for consistency.
   - **Dependencies**: None.

4. **Test Plan**
   - **Verification**: `npm run build -w packages/player`
   - **Success Criteria**: The code compiles and builds successfully with the updated attributes list.
   - **Edge Cases**: None.
