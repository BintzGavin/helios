#### 1. Context & Goal
- **Objective**: Document undocumented CSS variables in README.md.
- **Trigger**: Vision analysis revealed that `packages/player/src/index.ts` uses several CSS variables (`--helios-caption-scale`, `--helios-caption-bg`, `--helios-caption-color`, `--helios-caption-font-family`, `--helios-range-selected-color`, `--helios-range-unselected-color`) that are missing from the `packages/player/README.md` CSS Variables documentation.
- **Impact**: Ensures developers are aware of all available customization hooks, improving the player's theming capabilities.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/README.md` (Update the CSS Variables markdown table)
- **Read-Only**: `packages/player/src/index.ts`

#### 3. Implementation Spec
- **Architecture**: Append rows to the Markdown table in `packages/player/README.md` under the "CSS Variables" section.
- **Pseudo-Code**:
  Add the following rows to the existing table:
  | `--helios-caption-scale` | `0.05` | Scale factor for caption text size relative to player height. |
  | `--helios-caption-bg` | `rgba(0, 0, 0, 0.7)` | Background color of caption text. |
  | `--helios-caption-color` | `white` | Color of caption text. |
  | `--helios-caption-font-family` | `sans-serif` | Font family of caption text. |
  | `--helios-range-selected-color` | `rgba(255, 255, 255, 0.2)` | Background color of the selected playback range on the scrubber. |
  | `--helios-range-unselected-color` | `var(--helios-range-track-color)` | Background color of the unselected playback range on the scrubber. |
- **Public API Changes**: None (documentation only).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `cat packages/player/README.md | grep -A 15 "CSS Variables"`
- **Success Criteria**: The `README.md` file contains the newly documented CSS variables in the markdown table.
- **Edge Cases**: Ensure the table formatting remains valid markdown.