#### 1. Context & Goal
- **Objective**: Document the `captureStream()` method in the `<helios-player>` README.md.
- **Trigger**: The method is fully implemented in `src/index.ts` but missing from the public API documentation.
- **Impact**: Enables developers using Direct Mode to access the composition's underlying video and audio streams for WebRTC or custom pipelines.

#### 2. File Inventory
- **Create**: [None]
- **Modify**: `packages/player/README.md` (Add method documentation)
- **Read-Only**: `packages/player/src/index.ts` (For reference to the method signature)

#### 3. Implementation Spec
- **Architecture**: Update Markdown documentation.
- **Pseudo-Code**: Find the `### Methods` list under the `## Standard Media API` section in `packages/player/README.md`. Add a new bullet point describing `captureStream(): Promise<MediaStream> - Captures a real-time MediaStream of the composition (video and audio). Only supported in Direct Mode (same-origin).`
- **Public API Changes**: No code changes, only documentation alignment.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `cat packages/player/README.md | grep "captureStream"`.
- **Success Criteria**: The output must display the newly added documentation line for `captureStream()`.
- **Edge Cases**: Ensure the formatting perfectly matches the surrounding markdown list items.
