# Component Context: helios-player

## Description
A Web Component providing a UI for the Helios rendering engine. It runs the composition within a sandboxed iframe, providing playback controls, timeline scrubbing, a diagnostics overlay, audio mixing, and client-side rendering/export functionality.

## Component Structure
The `<helios-player>` component uses a Shadow DOM for encapsulation:
- **Wrapper**: A container element applying the aspect ratio or fixed dimensions.
  - **Iframe Container**: Holds the sandboxed `<iframe>` where the user's composition is loaded.
  - **UI Overlay**: Absolute positioned container for all controls.
    - **Top Bar**: Displays the media title/artist, if provided.
    - **Center Controls**: Big play button, error displays, loading spinner.
    - **Bottom Bar**: Contains the scrubber timeline, play/pause button, time display, volume control, track selector, settings menu (playback speed, loop range, diagnostics shortcut), fullscreen toggle, picture-in-picture toggle, and export button.
    - **Modals/Menus**: Settings overlay, Diagnostics overlay, Captions menu, Audio track menu.

## Attributes
The element observes the following attributes for state reflection:
- `src`: URL of the composition page to load in the iframe.
- `width`: Width of the player (aspect ratio calculation).
- `height`: Height of the player (aspect ratio calculation).
- `autoplay`: Automatically start playback when connected.
- `loop`: Loop playback when the end is reached.
- `controls`: Show the UI controls overlay.
- `export-mode`: Strategy for client-side export: `auto`, `canvas`, or `dom`.
- `canvas-selector`: CSS selector for the canvas element (used in `canvas` export mode).
- `export-format`: Output format: `mp4`, `webm`, `png`, or `jpeg`.
- `poster`: URL of an image to display before playback starts.
- `preload`: `auto` or `none`. If `none`, defers loading the iframe until interaction.
- `input-props`: JSON string of properties to pass to the composition.
- `interactive`: Enable direct interaction with the composition (disables click-to-pause).
- `controlslist`: Space-separated list of features to disable: `nodownload`, `nofullscreen`.
- `sandbox`: Security flags for the iframe.
- `export-width`: Target width for client-side export.
- `export-height`: Target height for client-side export.
- `muted`: Automatically mute the player's audio upon loading.
- `playsinline`: Indicates that the video is to be played inline.
- `export-bitrate`: Target bitrate for client-side export (bps).
- `export-filename`: Filename for client-side export (without extension).
- `export-caption-mode`: Strategy for caption export: `burn-in` or `file`.
- `disablepictureinpicture`: Hides the Picture-in-Picture button.
- `media-title`: Title of the composition for OS Media Session.
- `media-artist`: Artist name for OS Media Session.
- `media-album`: Album name for OS Media Session.
- `media-artwork`: URL of artwork for OS Media Session (defaults to poster).
- `crossorigin`: CORS setting for this media element.

## Methods (HTMLMediaElement Subset & API Parity)
- `setDuration(seconds: number): void;`
- `setFps(fps: number): void;`
- `setSize(width: number, height: number): void;`
- `setMarkers(markers: Marker[]): void;`
- `play(): Promise<void>;`
- `pause(): void;`
- `load(): void;`
- `addTextTrack(kind: TextTrackKind, label?: string, language?: string): TextTrack;`
- `fastSeek(time: number): void;`
- `canPlayType(type: string): CanPlayTypeResult;`
- `captureStream(): Promise<MediaStream>;`
- `startAudioMetering(): void;`
- `stopAudioMetering(): void;`
- `setPlaybackRange(startFrame: number, endFrame: number): void;`
- `clearPlaybackRange(): void;`
- `setSinkId(sinkId: string): Promise<void>;`

## Properties (HTMLMediaElement Subset & API Parity)
- `src`, `autoplay`, `loop`, `controls`, `poster`, `preload`, `sandbox`, `interactive`
- `currentTime`: Current playback position in seconds.
- `duration`: Total duration in seconds (read-only).
- `paused`: Whether playback is paused (read-only).
- `ended`: Whether playback has reached the end (read-only).
- `volume`: Audio volume (0.0 to 1.0).
- `muted`: Audio mute state.
- `playbackRate`: Playback speed (default 1.0).
- `width`, `height`: Player dimensions.
- `videoWidth`, `videoHeight`: Intrinsic composition dimensions (read-only).
- `buffered`, `seekable`: TimeRanges objects (always 0-duration, read-only).
- `seeking`: Whether the player is currently seeking (read-only).
- `readyState`: The current readiness state (0-4) (read-only).
- `networkState`: The current network state (0-3) (read-only).
- `error`: MediaError or null (read-only).
- `currentSrc`: Absolute URL of the chosen media resource (read-only).
- `played`: TimeRanges of the media source played (read-only).
- `defaultMuted`: Reflected defaultMuted attribute.
- `defaultPlaybackRate`: The default rate of playback.
- `textTracks`: TextTrackList (read-only).
- `audioTracks`: AudioTrackList (read-only).
- `videoTracks`: VideoTrackList (read-only).
- `disableRemotePlayback`: Reflected disableremoteplayback attribute.
- `mediaGroup`: Reflected mediagroup attribute.
- `sinkId`: Current audio sink id (read-only).

## Custom Helios Methods
- `getController(): HeliosController | null;`
- `getSchema(): Promise<HeliosSchema | undefined>;`
- `diagnose(): Promise<DiagnosticReport>;`
- `requestPictureInPicture(): Promise<PictureInPictureWindow>;`
- `export(options?: HeliosExportOptions): Promise<void>;`
- `getVideoPlaybackQuality(): VideoPlaybackQuality;`
- `requestVideoFrameCallback(callback: VideoFrameRequestCallback): number;`
- `cancelVideoFrameCallback(handle: number): void;`

## Custom Helios Properties
- `fps`: Frames per second of the composition (read-only).
- `currentFrame`: Current frame index.
- `inputProps`: JSON object of input properties.
- `exportMode`, `exportFormat`, `exportFilename`, `exportWidth`, `exportHeight`, `exportBitrate`, `exportCaptionMode`, `canvasSelector`, `controlsList`
- `mediaTitle`, `mediaArtist`, `mediaAlbum`, `mediaArtwork`

## Events
The component dispatches standard HTMLMediaElement events and some custom events:
- Standard: `play`, `pause`, `playing`, `waiting`, `suspend`, `stalled`, `seeking`, `seeked`, `ended`, `timeupdate`, `volumechange`, `ratechange`, `durationchange`, `loadstart`, `loadedmetadata`, `loadeddata`, `canplay`, `canplaythrough`, `error`, `abort`, `emptied`, `progress`
- Custom/Extended:
  - `audiometering`: Fired during playback reporting stereo RMS and Peak levels.
  - `resize`: Fired when player dimensions change.
  - `enterpictureinpicture`, `leavepictureinpicture`: Fired on PiP state changes.
