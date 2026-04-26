#### 1. Context & Goal
- **Objective**: Document `audioTracks`, `videoTracks`, `captureStream()`, `startAudioMetering()`, and `stopAudioMetering()` API members.
- **Trigger**: Discovered missing API parity documentation in `packages/player/README.md`.
- **Impact**: Provides accurate documentation of `<helios-player>` public API.

#### 2. File Inventory
- **Create**: []
- **Modify**: [`packages/player/README.md` - Add missing properties and methods to API section]
- **Read-Only**: [`packages/player/src/index.ts`]

#### 3. Implementation Spec
- **Architecture**: Update Markdown documentation.
- **Pseudo-Code**:
  - Add to Properties:
    - `- \`audioTracks\` (AudioTrackList, read-only): The audio tracks associated with the media element.`
    - `- \`videoTracks\` (VideoTrackList, read-only): The video tracks associated with the media element.`
  - Add to Methods:
    - `- \`captureStream(): Promise<MediaStream>\` - Captures a MediaStream from the player (Direct mode only).`
    - `- \`startAudioMetering(): void\` - Starts audio metering.`
    - `- \`stopAudioMetering(): void\` - Stops audio metering.`
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: `cat packages/player/README.md`
- **Success Criteria**: File contains the new properties and methods.
- **Edge Cases**: None
