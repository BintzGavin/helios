#### 1. Context & Goal
- **Objective**: Sync package version and update Agent Skills documentation to reflect v3.4.0 API.
- **Trigger**: Vision analysis revealed a documentation gap in `SKILL.md` regarding Audio Tracks and TypedArrays, and a version mismatch in `package.json`.
- **Impact**: Improves Agent Experience (AX) by preventing hallucinations about Audio/Schema APIs and ensuring version alignment.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/core/package.json`: Bump version to `3.4.0`.
  - `.agents/skills/helios/core/SKILL.md`: Add Audio Track API and TypedArray schema types.
- **Read-Only**:
  - `packages/core/src/index.ts`
  - `packages/core/src/schema.ts`

#### 3. Implementation Spec
- **Architecture**: Documentation sync. Update metadata and markdown files to match source code.
- **Pseudo-Code**:
  1. **Update `package.json`**: Set `"version": "3.4.0"`.
  2. **Update `SKILL.md`**:
     - **Audio Tracks**:
       - Add `AudioTrackState` type definition to the `HeliosState` or Types section.
       - Add `helios.audioTracks` to the "Public Helios Signals" section.
       - Add `setAudioTrackVolume(trackId, volume)` and `setAudioTrackMuted(trackId, muted)` to the "Audio Control" section.
       - Add a brief note about `data-helios-track-id` being used in DOM elements for track assignment.
     - **Schema**:
       - Add `int8array`, `uint8array`, `uint8clampedarray`, `int16array`, `uint16array`, `int32array`, `uint32array`, `float32array`, `float64array` to the supported types list in the "Schema Validation" section.

- **Public API Changes**: None (Documentation only).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npm test -w packages/core` to ensure version bump didn't break anything (sanity check).
  - Run `cat .agents/skills/helios/core/SKILL.md` to verify content updates.
- **Success Criteria**:
  - `package.json` version is `3.4.0`.
  - `SKILL.md` contains `setAudioTrackVolume` and `float32array`.
- **Edge Cases**: None.
