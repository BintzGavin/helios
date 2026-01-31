# 2026-06-05-RENDERER-EnableAudioLooping

## 1. Context & Goal
- **Objective**: Enable support for the `loop` attribute on `<audio>` and `<video>` elements to allow seamless background media looping.
- **Trigger**: Vision Gap - The "Use What You Know" principle implies standard HTML5 media behavior (looping) should be respected, but it is currently ignored.
- **Impact**: Users can create infinite background loops simply by adding the `loop` attribute to their media tags, eliminating the need for manual audio track configuration or editing.

## 2. File Inventory
- **Modify**: `packages/renderer/src/types.ts` (Add `loop` to `AudioTrackConfig`)
- **Modify**: `packages/renderer/src/utils/dom-scanner.ts` (Extract `loop` property)
- **Modify**: `packages/renderer/src/utils/FFmpegBuilder.ts` (Implement looping logic)
- **Create**: `packages/renderer/tests/verify-audio-loop.ts` (Verification script)

## 3. Implementation Spec

### Architecture
- **Data Flow**: `DomScanner` reads the `loop` property -> `RendererOptions` carries it via `AudioTrackConfig` -> `FFmpegBuilder` translates it into `-stream_loop -1` FFmpeg input argument.

### Logic Flow

#### `types.ts`
- UPDATE `AudioTrackConfig` interface:
  - ADD optional `loop` property (boolean).

#### `dom-scanner.ts`
- IN `scanForAudioTracks` script:
  - READ `el.loop` property from the media element.
  - MAP it to the `loop` property of the returned track object.

#### `FFmpegBuilder.ts`
- IN `getArgs` method (Loop over tracks):
  - CHECK if `track.loop` is true.
  - IF true:
    - PUSH `-stream_loop` and `-1` to `audioInputArgs` *before* pushing `-ss` and `-i`.
  - ELSE (default):
    - Proceed as existing (push `-ss`, `-i`).

### Public API Changes
- `AudioTrackConfig` (and thus `RendererOptions.audioTracks`) now accepts `{ loop: true }`.

### Dependencies
- None.

## 4. Test Plan

### Verification
- **Command**: `npx tsx packages/renderer/tests/verify-audio-loop.ts`
- **Script Logic (`verify-audio-loop.ts`)**:
  1. Launch Playwright.
  2. Intercept audio requests to dummy data.
  3. Create a page with `<audio src="loop.mp3" loop>` and `<audio src="once.mp3">`.
  4. Instantiate `DomStrategy` and call `prepare(page)`.
  5. Call `getFFmpegArgs` and capture the result.
  6. **Assert**: `args` contains `['-stream_loop', '-1', ..., '-i', '...loop.mp3']`.
  7. **Assert**: `args` does NOT contain `stream_loop` for `once.mp3`.
  8. Exit 0 on success, 1 on failure.

### Success Criteria
- The verification script passes, confirming that the `loop` attribute correctly triggers the `-stream_loop -1` FFmpeg argument.

### Edge Cases
- **Loop + Seek**: Verify `-stream_loop -1` appears *before* `-ss` (FFmpeg requirement for looping the input before seeking into it).
- **Loop + Offset**: Verify `adelay` filter is still applied correctly (handled by existing logic).
