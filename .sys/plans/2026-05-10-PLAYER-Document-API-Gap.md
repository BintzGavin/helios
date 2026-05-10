#### 1. Context & Goal
- **Objective**: Document missing properties, events, and attributes in `packages/player/README.md` to match the `HeliosPlayer` implementation.
- **Trigger**: The actual implementation in `index.ts` exposes standard properties (`src`, `autoplay`, `loop`, `controls`, `poster`, `interactive`, `preload`, and `sandbox`), dispatches `seeking` and `seeked` events, and observes the `playsinline` attribute, but these are missing from the respective sections in the `README.md` documentation.
- **Impact**: Ensures the documentation accurately reflects the public API of the `<helios-player>` Web Component, improving the developer experience.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/README.md` (Update Attributes table to add `playsinline`, Properties list to add `src`, `autoplay`, `loop`, `controls`, `poster`, `interactive`, `preload`, `sandbox`, and Events list to add `seeking` and `seeked`)
- **Read-Only**: `packages/player/src/index.ts`

#### 3. Implementation Spec
- **Architecture**: Documentation update to maintain parity with source code.
- **Pseudo-Code**:
  - Add `playsinline` to the Component Attributes markdown table.
  - Add `- \`src\` (string): Reflected src attribute.`, `- \`autoplay\` (boolean): Reflected autoplay attribute.`, `- \`loop\` (boolean): Reflected loop attribute.`, `- \`controls\` (boolean): Reflected controls attribute.`, `- \`poster\` (string): Reflected poster attribute.`, `- \`interactive\` (boolean): Reflected interactive attribute.`, `- \`preload\` (string): Reflected preload attribute.`, `- \`sandbox\` (string): Reflected sandbox attribute.` to the `### Properties` list.
  - Add `- \`seeking\`: Fired when a seek operation starts.`, `- \`seeked\`: Fired when a seek operation completes.` to the `## Events` list.
- **Public API Changes**: None (Documentation only)
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run `grep -i "seeked" packages/player/README.md`, `grep -i "playsinline" packages/player/README.md` and visually inspect the markdown formatting.
- **Success Criteria**: The README includes all missing properties, events, and attributes correctly formatted.
- **Edge Cases**: Ensure alphabetization or logical grouping is maintained if applicable.
