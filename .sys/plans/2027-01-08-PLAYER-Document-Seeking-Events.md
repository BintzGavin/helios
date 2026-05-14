### 1. Context & Goal
- **Objective**: Document the `seeking` and `seeked` events in the player's README.md file.
- **Trigger**: The player correctly fires `seeking` and `seeked` events when the scrubber is used or when `seekRelative` is invoked, but these events are missing from the "Events" section in `packages/player/README.md`.
- **Impact**: Brings the `README.md` documentation into alignment with the actual implementation in `packages/player/src/index.ts`.

### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/README.md`
- **Read-Only**: `packages/player/src/index.ts`

### 3. Implementation Spec
- **Architecture**: N/A (Documentation update)
- **Pseudo-Code**:
  - Locate the `## Events` section in `packages/player/README.md`.
  - Append the following bullet points to the list:
    - `- \`seeking\`: Fired when a seek operation begins.`
    - `- \`seeked\`: Fired when a seek operation completes.`
- **Public API Changes**: None (Documenting existing API)
- **Dependencies**: None

### 4. Test Plan
- **Verification**: `cat packages/player/README.md | grep -n "Events" -A 25`
- **Success Criteria**: The output must display the newly added `seeking` and `seeked` events in the list.
- **Edge Cases**: Ensure the formatting perfectly matches the existing bullet points.
