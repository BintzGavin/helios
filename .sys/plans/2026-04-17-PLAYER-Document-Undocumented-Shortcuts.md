#### 1. Context & Goal
- **Objective**: Document the undocumented keyboard shortcuts (`J`, `L`, `,`, `.`) in the `README.md`.
- **Trigger**: The `<helios-player>` Web Component implements standard keyboard shortcuts for seeking forward/backward by 10 seconds (`L`/`J`) and 1 frame (`.`/`,`), but these are missing from the "Keyboard Shortcuts" table in the documentation.
- **Impact**: Accurately reflects the player's full interactive capabilities to users and developers, closing the gap between actual implementation and the documented vision.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/README.md`
- **Read-Only**: `packages/player/src/index.ts`

#### 3. Implementation Spec
- **Architecture**: Markdown documentation update.
- **Pseudo-Code**:
  - Locate the `### Keyboard Shortcuts` section in `packages/player/README.md`.
  - Add the following rows to the table:
    - `| \`J\` | Seek backward 10 seconds |`
    - `| \`L\` | Seek forward 10 seconds |`
    - `| \`,\` | Seek backward 1 frame |`
    - `| \`.\` | Seek forward 1 frame |`
- **Public API Changes**: None (documentation only).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `cat packages/player/README.md | grep -E "J|L|,|\."`
- **Success Criteria**: The newly added keyboard shortcuts are present in the documentation.
- **Edge Cases**: Ensure the markdown table formatting is preserved and aligned correctly with existing entries.
