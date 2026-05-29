#### 1. Context & Goal
- **Objective**: Document standard event handlers (`onplay`, `onpause`, etc.) in `packages/player/README.md`.
- **Trigger**: The `.jules/PLAYER.md` journal states `v0.77.41 - Documenting Event Handlers: The standard event handler properties (onplay, onpause, etc.) were implemented for API parity but never explicitly documented in the README, leading to a vision gap.`
- **Impact**: Brings the `README.md` documentation into alignment with the actual implemented API properties on the `<helios-player>` Web Component, satisfying the API parity vision gap.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/README.md` (Add 'Event Handlers' section under 'Standard Media API' documenting `onplay`, `onpause`, `onended`, `ontimeupdate`, `onvolumechange`, `onratechange`, `ondurationchange`, `onseeking`, `onseeked`, `onresize`, `onloadstart`, `onloadedmetadata`, `onloadeddata`, `oncanplay`, `oncanplaythrough`, `onerror`, `onenterpictureinpicture`, `onleavepictureinpicture`)
- **Read-Only**: `packages/player/src/index.ts` (to verify handlers)

#### 3. Implementation Spec
- **Architecture**: Update Markdown documentation to match implemented code.
- **Pseudo-Code**: Add an `### Event Handlers` section under the `## Standard Media API` section in `packages/player/README.md` listing all implemented `on*` properties.
- **Public API Changes**: None (documentation only).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `cat packages/player/README.md | grep -A 25 "### Event Handlers"`
- **Success Criteria**: The README contains the new "Event Handlers" section listing all implemented `on*` properties.
- **Edge Cases**: Ensure the formatting matches the existing "Methods" and "Properties" sections.
