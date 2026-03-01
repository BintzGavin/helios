#### 1. Context & Goal
- **Objective**: Document the `audioTracks` and `videoTracks` properties in the player's standard media API parity list.
- **Trigger**: The recent implementations of `HeliosAudioTrackList` and `HeliosVideoTrackList` (`[v0.66.0]`) exposed the `audioTracks` and `videoTracks` properties on the `<helios-player>`, but these were not added to the `README.md`.
- **Impact**: Ensures developers are aware of the newly implemented APIs for accessing audio and video tracks, aligning documentation with current reality and improving developer experience.

#### 2. File Inventory
- **Create**: []
- **Modify**:
  - `packages/player/README.md`: Add `- \`audioTracks\` (AudioTrackList, read-only): The audio tracks associated with the media element.` and `- \`videoTracks\` (VideoTrackList, read-only): The video tracks associated with the media element.` to the `### Properties` section.
- **Read-Only**:
  - `packages/player/src/index.ts` to confirm property getters.

#### 3. Implementation Spec
- **Architecture**: Documentation update to maintain parity with implemented features.
- **Pseudo-Code**:
  - Locate the `### Properties` section in `packages/player/README.md`.
  - Insert the two new properties `audioTracks` and `videoTracks` below the `textTracks` property to maintain logical grouping of track lists.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run `cat packages/player/README.md | grep -E "(audioTracks|videoTracks)"`.
- **Success Criteria**: The README correctly lists `audioTracks` and `videoTracks` under the properties section.
- **Edge Cases**: Ensure the formatting perfectly matches other list items in the Properties section.
