#### 1. Context & Goal
- **Objective**: Document the `mediaTitle`, `mediaArtist`, `mediaAlbum`, and `mediaArtwork` properties in the `README.md`.
- **Trigger**: The properties were recently added to `<helios-player>` to achieve Media Session parity (`v0.77.0`), but are missing from the "Standard Media API - Properties" section in `README.md`.
- **Impact**: Improves API parity documentation and makes the properties discoverable to users.

#### 2. File Inventory
- **Create**: []
- **Modify**: [`packages/player/README.md`]
- **Read-Only**: [`packages/player/src/index.ts`]

#### 3. Implementation Spec
- **Architecture**: N/A - Documentation update
- **Pseudo-Code**:
  - Edit `packages/player/README.md`
  - Locate the `### Properties` list under `## Standard Media API`.
  - Append entries for `mediaTitle`, `mediaArtist`, `mediaAlbum`, and `mediaArtwork`, indicating they correspond to their respective reflected attributes.
- **Public API Changes**: Documentation only.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `cat packages/player/README.md | grep -i "mediaTitle"`
- **Success Criteria**: The properties are correctly listed in the README's properties section.
- **Edge Cases**: N/A
