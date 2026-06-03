# Context: Player (`packages/player`)

## Section A: Component Structure
The `HeliosPlayer` is a standard Web Component (Custom Element: `<helios-player>`).

**Shadow DOM Layout**:
- `.helios-wrapper`: Main container.
- `iframe`: Isolates user code (untrusted content).
- `.ui-overlay`: Contains the standard playback controls.
- `video.pip-video`: Hidden video element used exclusively to proxy the canvas stream for Picture-in-Picture.
- `.loading-overlay`, `.error-overlay`, `.export-overlay`, `.status-overlay`: State-specific overlays.

## Section B: Events
The component dispatches standard HTML5 Media events:
- `play`, `pause`, `ended`, `timeupdate`, `durationchange`, `volumechange`, `ratechange`, `seeked`, `seeking`, `error`, `loadedmetadata`, `loadeddata`, `canplay`, `canplaythrough`, `playing`, `waiting`, `emptied`, `stalled`, `suspend`, `abort`

Custom extensions:
- `error` events carry a `code` and `message` compatible with `MediaError`.
- `audiometering` events report stereo RMS and Peak audio levels.

## Section C: Attributes
Observed attributes:
- `src`: The URL of the content to load into the iframe.
- `width`, `height`: Dimensions of the player.
- `controls`: Boolean attribute to toggle the UI overlay.
- `loop`: Boolean attribute to enable looping playback.
- `autoplay`: Boolean attribute for auto-playback.
- `muted`: Boolean attribute to start the player muted.
- `playsinline`: Indicates that the video is to be played "inline", within the element's playback area.
- `poster`: Image URL displayed before playback starts.
- `preload`: Strategy for preloading (none, metadata, auto).
- `canvas-selector`: CSS selector for the primary canvas inside the iframe (default: `canvas`).

## Section D: Public API
- `play(): Promise<void>`
- `pause(): void`
- `seek(timeInSeconds: number): Promise<void>`
- `fastSeek(timeInSeconds: number): void`
- `captureStream(): Promise<MediaStream>`
- `export(options?: ExportOptions): Promise<void>`
- `diagnose(): Promise<DiagnosticReport>`
- `startAudioMetering(): void`
- `stopAudioMetering(): void`
- `addTextTrack(kind: TextTrackKind, label?: string, language?: string): TextTrack`

Properties:
- `currentTime: number`
- `duration: number`
- `volume: number`
- `playbackRate: number`
- `paused: boolean`
- `ended: boolean`
- `error: MediaError | null`
- `onaudiometering: ((event: Event) => void) | null`
- `readyState: number`
- `networkState: number`
- `srcObject: MediaStream | MediaSource | Blob | null`
- `audioTracks: AudioTrackList`
- `videoTracks: VideoTrackList`
- `textTracks: TextTrackList`
- `mediaSession: MediaSession`

## Section E: Export Capabilities
The player supports client-side export utilizing `@helios-project/core` rendering.
Supported Formats: `mp4`, `webm`, `png`, `jpeg`
Supported Features: Resizing, Bitrate control, Audio merging, Caption rendering.
