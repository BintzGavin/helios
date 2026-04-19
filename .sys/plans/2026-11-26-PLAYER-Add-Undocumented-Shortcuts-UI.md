#### 1. Context & Goal
- **Objective**: Add undocumented keyboard shortcuts (J, L, comma, period) to the player's Shortcuts UI menu.
- **Trigger**: The recent update documented these shortcuts in `README.md`, but they are still missing from the actual UI overlay inside the player (`renderShortcuts` in `index.ts`).
- **Impact**: Provides users with complete in-player documentation of available shortcuts, improving usability and closing the vision gap.

#### 2. File Inventory
- **Create**: []
- **Modify**: [`packages/player/src/index.ts`]
- **Read-Only**: [`packages/player/README.md`]

#### 3. Implementation Spec
- **Architecture**: Update the hardcoded shortcuts array within the `HeliosPlayer` class.
- **Pseudo-Code**:
  - In `packages/player/src/index.ts`, locate the `renderShortcuts()` method.
  - Add the following entries to the `shortcuts` array:
    ```typescript
    { key: "J", desc: "Seek backward 10s" },
    { key: "L", desc: "Seek forward 10s" },
    { key: ",", desc: "Seek backward 1 frame" },
    { key: ".", desc: "Seek forward 1 frame" },
    ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `cd packages/player && npx vitest run src/index.test.ts`
- **Success Criteria**: The build succeeds. Manual verification (or future UI tests) will show the newly added shortcuts in the "?" overlay.
- **Edge Cases**: None.
