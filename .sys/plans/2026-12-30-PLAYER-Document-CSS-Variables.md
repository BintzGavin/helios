# Context & Goal
- **Objective**: Document undocumented CSS variables in README.md to fix a vision gap.
- **Trigger**: `packages/player/src/index.ts` exposes several CSS variables for captions and range selection (`--helios-caption-bg`, `--helios-caption-color`, `--helios-caption-font-family`, `--helios-caption-scale`, `--helios-range-selected-color`, `--helios-range-unselected-color`) that are missing from the `README.md` CSS Variables section.
- **Impact**: Developers using `<helios-player>` will be able to fully theme the caption overlays and timeline range indicators using standard CSS variables, bringing the documented API surface into parity with the actual implementation.

# File Inventory
- **Create**: None
- **Modify**:
  - `packages/player/README.md` (Add missing CSS variables)
- **Read-Only**:
  - `packages/player/src/index.ts` (Reference for default variable values)

# Implementation Spec
- **Architecture**: Update documentation to accurately reflect the actual Web Component's CSS Custom Properties.
- **Pseudo-Code**:
  - Locate `## CSS Variables` section in `packages/player/README.md`.
  - Add rows to the Markdown table for the undocumented variables.
- **Public API Changes**: No code changes, only documentation alignment.
- **Dependencies**: None.

# Test Plan
- **Verification**: `cat packages/player/README.md | grep -A 15 "## CSS Variables"`
- **Success Criteria**: The table must include `--helios-caption-bg`, `--helios-caption-color`, `--helios-caption-font-family`, `--helios-caption-scale`, `--helios-range-selected-color`, and `--helios-range-unselected-color`.
- **Edge Cases**: Ensure the markdown table formatting remains aligned.
