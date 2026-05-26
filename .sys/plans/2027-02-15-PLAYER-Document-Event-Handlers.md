#### 1. Context & Goal
- **Objective**: Document the missing HTMLMediaElement standard event handler properties (`onplay`, `onpause`, `onended`, etc.) in `packages/player/README.md`.
- **Trigger**: Vision gap identified between the actual implementation (which includes `_onplay`, `_onpause`, etc., with public getters/setters) and the README (which lacks documentation for them).
- **Impact**: Provides developers with clear documentation on how to use standard event handler properties with the `<helios-player>` Web Component, improving API parity documentation and AX/DX.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/README.md` (Add a new `### Event Handlers` section under `## Standard Media API`).
- **Read-Only**: `packages/player/src/index.ts` (Verify exact list of implemented event handlers).

#### 3. Implementation Spec
- **Architecture**: Update Markdown documentation.
- **Pseudo-Code**:
  - Locate `### Properties` section within `## Standard Media API` in `packages/player/README.md`.
  - Add a new `### Event Handlers` section immediately after it (or before `## Events`).
  - List the implemented event handler properties based on `packages/player/src/index.ts`: `onplay`, `onpause`, `onended`, `ontimeupdate`, `onvolumechange`, `onratechange`, `ondurationchange`, `onseeking`, `onseeked`, `onresize`, `onloadstart`, `onloadedmetadata`, `onloadeddata`, `oncanplay`, `oncanplaythrough`, `onerror`, `onenterpictureinpicture`, `onleavepictureinpicture`.
- **Public API Changes**: None (documentation only).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `grep -A 20 "### Event Handlers" packages/player/README.md`
- **Success Criteria**: The README includes the new section listing all standard event handler properties.
- **Edge Cases**: Ensure no existing sections or Markdown formatting are broken.
