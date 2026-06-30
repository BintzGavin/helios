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
- `abort`: Dispatched when media data loading has been aborted.
- `emptied`: Dispatched when the media has become empty.
- `progress`: Dispatched periodically as the browser loads a resource.
The component dispatches standard HTML5 Media events:
- `play`, `pause`, `ended`, `timeupdate`, `durationchange`, `volumechange`, `ratechange`, `seeked`, `seeking`, `error`, `loadedmetadata`, `loadeddata`, `canplay`, `canplaythrough`, `playing`, `waiting`, `emptied`, `stalled`, `suspend`, `abort`, `progress`

Custom extensions:
- `error` events carry a `code` and `message` compatible with `MediaError`.
- `audiometering` events report stereo RMS and Peak audio levels.

## Section C: Attributes
- `disableremoteplayback`: Reflected boolean attribute.
- `mediagroup`: Reflected string attribute.
Observed attributes:
- `src`: The URL of the content to load into the iframe.
- `interactive`: Enable direct interaction with the composition.
- `sandbox`: Security flags for the iframe.
- `width`, `height`: Dimensions of the player.
- `controls`: Boolean attribute to toggle the UI overlay.
- `loop`: Boolean attribute to enable looping playback.
- `autoplay`: Boolean attribute for auto-playback.
- `muted`: Boolean attribute to start the player muted.
- `playsinline`: Indicates that the video is to be played "inline", within the element's playback area.
- `poster`: Image URL displayed before playback starts.
- `preload`: Strategy for preloading (none, metadata, auto).
- `export-width`, `export-height`: Optional target dimensions for exported media.
- `export-bitrate`: Optional target bitrate for video exports.
- `canvas-selector`: CSS selector for the primary canvas inside the iframe (default: `canvas`).

## Section D: Public API
- `play(): Promise<void>`
- `pause(): void`
- `setPlaybackRange(startFrame: number, endFrame: number): void`
- `clearPlaybackRange(): void`
- `seek(timeInSeconds: number): Promise<void>`
- `fastSeek(timeInSeconds: number): void`
- `setMediaKeys(mediaKeys: MediaKeys | null): Promise<void>`
- `captureStream(): Promise<MediaStream>`
- `export(options?: ExportOptions): Promise<void>`
- `diagnose(): Promise<DiagnosticReport>`
- `startAudioMetering(): void`
- `stopAudioMetering(): void`
- `addTextTrack(kind: TextTrackKind, label?: string, language?: string): TextTrack`

Properties:
- `HAVE_NOTHING`, `HAVE_METADATA`, `HAVE_CURRENT_DATA`, `HAVE_FUTURE_DATA`, `HAVE_ENOUGH_DATA`: Instance media constant values.
- `NETWORK_EMPTY`, `NETWORK_IDLE`, `NETWORK_LOADING`, `NETWORK_NO_SOURCE`: Instance media constant values.
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
- `mediaKeys: MediaKeys | null`

## Section E: Export Capabilities
The player supports client-side export utilizing `@helios-project/core` rendering.
Supported Formats: `mp4`, `webm`, `png`, `jpeg`
Supported Features: Resizing, Bitrate control, Audio merging, Caption rendering.

- `onplaying`, `onwaiting`, `onsuspend`, `onstalled`: Standard media event handler properties.
\n## Section D: Methods\n- `getVideoPlaybackQuality()`: Returns playback quality metrics.\n- `requestVideoFrameCallback(callback: VideoFrameRequestCallback): number`: Registers a callback to be fired when a new frame is rendered.\n- `cancelVideoFrameCallback(handle: number): void`: Cancels a previously registered video frame callback.
