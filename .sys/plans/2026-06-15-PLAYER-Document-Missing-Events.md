#### 1. Context & Goal
- **Objective**: Document the `abort`, `emptied`, and `progress` custom events in the `packages/player/README.md` file.
- **Trigger**: The `abort`, `emptied`, and `progress` events were implemented in `index.ts` and their event handlers (`onabort`, `onemptied`, `onprogress`) were documented, but the events themselves are missing from the "Events" list in `README.md`.
- **Impact**: Ensures complete and accurate documentation of the `<helios-player>` Web Component's API surface, providing clear API parity visibility.

#### 2. File Inventory
- **Create**: []
- **Modify**:
  - `packages/player/README.md`: Add `abort`, `emptied`, and `progress` to the "Events" section.
- **Read-Only**: []

#### 3. Implementation Spec
- **Architecture**: N/A - Documentation only.
- **Pseudo-Code**:
  - Locate the "## Events" section in `packages/player/README.md`.
  - Add the following entries to the list:
    - `- \`abort\`: Fired when the loading of the media is aborted.`
    - `- \`emptied\`: Fired when the media has become empty.`
    - `- \`progress\`: Fired periodically as the browser loads a resource.`
- **Public API Changes**: None (documentation of existing API).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `cat packages/player/README.md | grep -E "^- \`abort\`|^- \`emptied\`|^- \`progress\`"`
- **Success Criteria**: The command should output the three added event descriptions.
- **Edge Cases**: Ensure the formatting perfectly matches the surrounding list items.
