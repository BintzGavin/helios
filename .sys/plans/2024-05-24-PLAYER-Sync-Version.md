# Sync Version & Documentation

## 1. Context & Goal
- **Objective**: Synchronize the `packages/player` version to `0.66.1` and update the README to document the recently added `audioTracks` and `videoTracks` APIs.
- **Trigger**: A discrepancy exists between `package.json` (0.65.2) and the released status in `docs/status/PLAYER.md` (0.66.1). Additionally, the Standard Media API documentation is missing the tracks properties.
- **Impact**: Ensures the package version reflects the feature set (preventing confusion) and provides complete API documentation for developers.

## 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/player/package.json`: Update version.
  - `packages/player/README.md`: Add API documentation.
- **Read-Only**:
  - `docs/status/PLAYER.md`
  - `packages/player/src/index.ts` (for reference)

## 3. Implementation Spec
- **Architecture**: Configuration and Documentation update only. No functional code changes.
- **Pseudo-Code**:
  1.  **packages/player/package.json**:
      - Change `version` from `0.65.2` to `0.66.1`.
  2.  **packages/player/README.md**:
      - Under **Properties**:
        - Add `audioTracks` (AudioTrackList, read-only).
        - Add `videoTracks` (VideoTrackList, read-only).
- **Public API Changes**: None (Documentation only).
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  - Run `npm run build -w packages/player` to ensure the package builds with the new version.
  - Run `npm test -w packages/player` to ensure no regressions.
- **Success Criteria**:
  - `package.json` version is `0.66.1`.
  - `README.md` contains entries for `audioTracks` and `videoTracks`.
  - Build and tests pass.
- **Edge Cases**: None.
