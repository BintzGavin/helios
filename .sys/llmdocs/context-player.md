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
- `play`, `pause`, `ended`, `timeupdate`, `durationchange`, `volumechange`, `ratechange`, `seeked`, `seeking`, `error`, `loadedmetadata`, `loadeddata`, `canplay`, `canplaythrough`, `playing`, `waiting`, `emptied`, `stalled`, `suspend`, `abort`, `progress`

Custom extensions:
- `error` events carry a `code` and `message` compatible with `MediaError`.
- `audiometering` events report stereo RMS and Peak audio levels.

## Section C: Attributes
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
- `disableremoteplayback`: Reflected boolean attribute.
- `mediagroup`: Reflected string attribute.

## Section D: Public API
- `play(): Promise<void>`
- `pause(): void`
- `seek(timeInSeconds: number): Promise<void>`
- `fastSeek(timeInSeconds: number): void`
- `setPlaybackRange(startFrame: number, endFrame: number): void`
- `clearPlaybackRange(): void`
- `setDuration(seconds: number): void`
- `setFps(fps: number): void`
- `setSize(width: number, height: number): void`
- `setMarkers(markers: Marker[]): void`
- `setMediaKeys(mediaKeys: MediaKeys | null): Promise<void>`
- `captureStream(): Promise<MediaStream>`
- `export(options?: ExportOptions): Promise<void>`
- `diagnose(): Promise<DiagnosticReport>`
- `getController(): HeliosController | null`
- `startAudioMetering(): void`
- `stopAudioMetering(): void`
- `addTextTrack(kind: TextTrackKind, label?: string, language?: string): TextTrack`
- `getVideoPlaybackQuality(): VideoPlaybackQuality`
- `requestVideoFrameCallback(callback: VideoFrameRequestCallback): number`
- `cancelVideoFrameCallback(handle: number): void`

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
- `onplaying`, `onwaiting`, `onsuspend`, `onstalled`, `onabort`, `onemptied`, `onprogress`: Standard media event handler properties.

## Section E: Export Capabilities
The player supports client-side export utilizing `@helios-project/core` rendering.
Supported Formats: `mp4`, `webm`, `png`, `jpeg`
Supported Features: Resizing, Bitrate control, Audio merging, Caption rendering.
