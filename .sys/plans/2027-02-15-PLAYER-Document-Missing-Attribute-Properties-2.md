#### 1. Context & Goal
- **Objective**: Document missing standard media properties (`src`, `autoplay`, `loop`, `controls`, `poster`, `preload`) in `packages/player/README.md`.
- **Trigger**: Vision gap identified between the actual implementation (which includes getters and setters for these properties returning strings or booleans) and the README (which lacks documentation for them).
- **Impact**: Provides developers with complete documentation on the standard HTMLMediaElement properties supported by the `<helios-player>` Web Component.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/README.md` (Add missing properties to the `### Properties` section).
- **Read-Only**: `packages/player/src/index.ts` (Verify exact properties implemented).

#### 3. Implementation Spec
- **Architecture**: Update Markdown documentation to reflect existing public API surface.
- **Pseudo-Code**:
  - Locate `### Properties` section within `## Standard Media API` in `packages/player/README.md`.
  - Add the following properties to the list:
    - `- \`src\` (string): Reflected src attribute.`
    - `- \`autoplay\` (boolean): Reflected autoplay attribute.`
    - `- \`loop\` (boolean): Reflected loop attribute.`
    - `- \`controls\` (boolean): Reflected controls attribute.`
    - `- \`poster\` (string): Reflected poster attribute.`
    - `- \`preload\` (string): Reflected preload attribute.`
- **Public API Changes**: None (documentation only).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `grep -i "autoplay" packages/player/README.md` and `grep -i "poster" packages/player/README.md`
- **Success Criteria**: The README includes the new documented properties in the `### Properties` list.
- **Edge Cases**: Ensure Markdown formatting is preserved.
