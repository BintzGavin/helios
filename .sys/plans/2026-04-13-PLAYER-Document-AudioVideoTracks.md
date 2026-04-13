#### 1. Context & Goal
- **Objective**: Document missing `audioTracks` and `videoTracks` properties in the README.md.
- **Trigger**: Discovered missing documentation for implemented Standard Media API properties `audioTracks` and `videoTracks` in `packages/player/README.md`.
- **Impact**: Improves API discoverability for developers relying on Standard Media APIs like HTMLMediaElement parity.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/README.md` (Add `audioTracks` and `videoTracks` to the Properties section).
- **Read-Only**: `packages/player/src/index.ts`

#### 3. Implementation Spec
- **Architecture**: Documentation updates for `HTMLMediaElement` parity.
- **Pseudo-Code**:
  - Open `packages/player/README.md`.
  - Locate the "Properties" section under "Standard Media API".
  - Add `- \`audioTracks\` (AudioTrackList, read-only): The audio tracks associated with the media element.` after `textTracks`.
  - Add `- \`videoTracks\` (VideoTrackList, read-only): The video tracks associated with the media element.` after `audioTracks`.
- **Public API Changes**: None (documentation only).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Use `run_in_bash_session` to execute `cat packages/player/README.md | grep -i "\`audioTracks\`"`
- **Success Criteria**: The README correctly lists `audioTracks` and `videoTracks` in the Properties section.
- **Edge Cases**: None.
