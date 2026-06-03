#### 1. Context & Goal
- **Objective**: Document the missing standard media properties (`src`, `autoplay`, `loop`, `controls`, `poster`, `preload`, `sandbox`, `interactive`) in the `README.md` file.
- **Trigger**: Discovered that several properties implemented on the `<helios-player>` web component are not documented in the "Properties" section of the README.md, creating a gap between the actual implementation and documented vision.
- **Impact**: Ensures that developers have accurate and complete documentation of the `<helios-player>` Javascript API.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/README.md` (Add missing properties to the "Properties" list).
- **Read-Only**: `packages/player/src/index.ts`

#### 3. Implementation Spec
- **Architecture**: Update Markdown documentation to match the Web Component's implemented properties.
- **Pseudo-Code**:
  - Use `replace_with_git_merge_diff` to add the following lines to the "Properties" list in `packages/player/README.md`:
    - `- \`src\` (string): URL of the composition page to load in the iframe.`
    - `- \`autoplay\` (boolean): Reflected autoplay attribute.`
    - `- \`loop\` (boolean): Reflected loop attribute.`
    - `- \`controls\` (boolean): Reflected controls attribute.`
    - `- \`poster\` (string): Reflected poster attribute.`
    - `- \`preload\` (string): Reflected preload attribute.`
    - `- \`sandbox\` (string): Reflected sandbox attribute.`
    - `- \`interactive\` (boolean): Reflected interactive attribute.`
- **Public API Changes**: No code changes; strictly documentation.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `cat packages/player/README.md | grep -E "src|autoplay|loop|controls|poster|preload|sandbox|interactive"`
- **Success Criteria**: The `README.md` correctly displays the newly documented properties.
- **Edge Cases**: None.
