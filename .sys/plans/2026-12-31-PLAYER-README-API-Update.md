#### 1. Context & Goal
- **Objective**: Document `getController()` and caption CSS variables in `packages/player/README.md`.
- **Trigger**: The `<helios-player>` Web Component exposes `getController` and caption-related CSS variables (`--helios-caption-bg`, `--helios-caption-color`, `--helios-caption-font-family`), but they are missing from the `README.md` file.
- **Impact**: Ensures that developers have access to complete API documentation, facilitating theming of captions and programmatic access to the underlying controller.

#### 2. File Inventory
- **Create**: (None)
- **Modify**:
  - `packages/player/README.md`: Add `getController(): HeliosController | null` to the Methods section. Add caption CSS variables to the CSS Variables section.
- **Read-Only**:
  - `packages/player/src/index.ts`: To confirm the signature and CSS variables.

#### 3. Implementation Spec
- **Architecture**: No code changes. Just documentation updates to match the current implementation in `index.ts`.
- **Pseudo-Code**:
  - Add `- \`getController(): HeliosController | null\` - Retrieves the underlying \`HeliosController\` instance.` to the Methods section.
  - Add the following rows to the CSS Variables table:
    - `| --helios-caption-bg | (none) | Background color of the captions container. |`
    - `| --helios-caption-color | (none) | Text color of the captions. |`
    - `| --helios-caption-font-family | (none) | Font family for the captions. |`
- **Public API Changes**: None (documentation only).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `grep -n "getController" packages/player/README.md && grep -n "helios-caption-bg" packages/player/README.md`
- **Success Criteria**: The `getController` method and caption CSS variables should be listed in the README.
- **Edge Cases**: N/A
