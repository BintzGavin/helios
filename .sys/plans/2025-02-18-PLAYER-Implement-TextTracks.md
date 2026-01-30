# 2025-02-18-PLAYER-Implement-TextTracks.md

#### 1. Context & Goal
- **Objective**: Implement `textTracks` property and `addTextTrack` method on `<helios-player>` to achieve deeper Standard Media API parity.
- **Trigger**: Vision Gap - `HTMLMediaElement` parity requires `textTracks` for programmatic caption management.
- **Impact**: Enables third-party captioning tools and scripts to interact with Helios captions via standard APIs.

#### 2. File Inventory
- **Create**:
  - `packages/player/src/features/text-tracks.ts`: Implementation of `HeliosTextTrack` and `HeliosTextTrackList`.
  - `packages/player/src/features/srt-parser.ts`: Simple SRT parser to convert text to objects compatible with `VTTCue`.
- **Modify**:
  - `packages/player/src/index.ts`: Integrate `textTracks` and `addTextTrack`; refactor `handleSlotChange` to use the new API.
  - `packages/player/src/api_parity.test.ts`: Add tests for `textTracks` and `addTextTrack`.
- **Read-Only**:
  - `packages/player/src/controllers.ts`: To reference `HeliosController` interface.

#### 3. Implementation Spec
- **Architecture**:
  - `HeliosTextTrack` implements the `TextTrack` interface (mocking where necessary for JSDOM).
  - `HeliosTextTrack` observes its `mode` property. When `mode` becomes `'showing'`, it converts its cues to `CaptionCue[]` and calls `player.controller.setCaptions()`.
  - `HeliosPlayer` initializes a `HeliosTextTrackList`.
  - `handleSlotChange` parses `<track>` src (SRT), converts to cues, and adds them to a `HeliosTextTrack`.
- **Pseudo-Code**:
  - **SRT Parser**:
    ```typescript
    function parseSRT(text):
      blocks = text.split(\n\n)
      for block in blocks:
        lines = block.split(\n)
        if lines.length < 3 continue
        timestamps = parse(lines[1]) // "00:00:01,000 --> 00:00:04,000"
        text = lines.slice(2).join(\n)
        yield { startTime, endTime, text }
    ```
  - **TextTrack Mode Logic**:
    ```typescript
    class HeliosTextTrack:
      set mode(value):
        if value === 'showing':
          cues = this.cues.map(toCaptionCue)
          player.controller.setCaptions(cues)
          // Ensure only one track is showing (if desired behavior)
        else if value === 'disabled' && wasShowing:
          player.controller.setCaptions([])
        super.mode = value
    ```
- **Public API Changes**:
  - `<helios-player>` now exposes `.textTracks` (TextTrackList) and `.addTextTrack()`.
  - `<helios-player>` implementation of caption logic moves from "load-and-set" to "track-model-driven".
- **Dependencies**:
  - None (Uses standard web APIs).

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - `player.textTracks` returns a list.
  - `player.addTextTrack()` adds a track to the list.
  - Setting `track.mode = 'showing'` updates the controller with cues.
  - `<track>` elements in slot are correctly parsed and added to `textTracks`.
- **Edge Cases**:
  - Multiple tracks (switching between them).
  - Programmatically added cues vs loaded cues.
  - JSDOM environment missing `VTTCue` global (need shim).
