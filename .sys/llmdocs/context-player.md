# Context: Player

The `packages/player` domain implements the `<helios-player>` Web Component, which provides a rich UI wrapper around the Helios Core engine. It handles iframe sandboxing, bridge communication, UI controls, and client-side export.

## A. Component Structure

The `<helios-player>` component uses Shadow DOM to encapsulate its internal structure.

```html
<helios-player>
  #shadow-root
    <!-- Style definitions (omitted) -->

    <!-- Audio Menu Overlay -->
    <div class="audio-menu hidden" part="audio-menu" role="dialog"></div>

    <!-- Settings Menu Overlay -->
    <div class="settings-menu hidden" part="settings-menu" role="dialog"></div>

    <!-- Export Menu Overlay -->
    <div class="export-menu hidden" part="export-menu" role="dialog"></div>

    <!-- Shortcuts Overlay -->
    <div class="shortcuts-overlay hidden" part="shortcuts-overlay"></div>

    <!-- Diagnostics Overlay -->
    <div class="debug-overlay hidden" part="debug-overlay"></div>

    <!-- Status Overlay (Loading/Error) -->
    <div class="status-overlay hidden" part="overlay">
       <div class="status-text" part="status-text"></div>
       <button class="retry-btn" part="retry-button">Retry</button>
    </div>

    <!-- Poster & Big Play Button -->
    <div class="poster-container hidden" part="poster">
       <img class="poster-image" part="poster-image" />
       <div class="big-play-btn" part="big-play-button"></div>
    </div>

    <!-- Picture-in-Picture Video Element (Hidden) -->
    <video class="pip-video"></video>

    <!-- Sandboxed Iframe -->
    <iframe part="iframe" sandbox="..."></iframe>

    <!-- Click Layer (for play/pause interaction) -->
    <div class="click-layer" part="click-layer"></div>

    <!-- Captions Overlay -->
    <div class="captions-container" part="captions"></div>

    <!-- UI Controls -->
    <div class="controls" part="controls">
       <button class="play-pause-btn" part="play-pause-button"></button>

       <div class="volume-control" part="volume-control">
          <button class="volume-btn" part="volume-button"></button>
          <input type="range" class="volume-slider" part="volume-slider" />
       </div>

       <button class="audio-btn" part="audio-button"></button>
       <button class="cc-btn" part="cc-button"></button>
       <button class="export-btn" part="export-button"></button>

       <div class="scrubber-wrapper" part="scrubber-wrapper">
          <div class="scrubber-tooltip hidden" part="tooltip"></div>
          <div class="markers-container" part="markers"></div>
          <input type="range" class="scrubber" part="scrubber" />
       </div>

       <div class="time-display" part="time-display"></div>

       <button class="fullscreen-btn" part="fullscreen-button"></button>
       <button class="pip-btn" part="pip-button"></button>
       <button class="settings-btn" part="settings-button"></button>
    </div>
</helios-player>
```

## B. Events

The component dispatches the following Standard Media API events and custom events:

| Event Name | Type | Description |
| :--- | :--- | :--- |
| `play` | `Event` | Fired when playback begins. |
| `pause` | `Event` | Fired when playback is paused. |
| `ended` | `Event` | Fired when playback reaches the end of the duration. |
| `timeupdate` | `Event` | Fired when the current playback position changes. |
| `volumechange` | `Event` | Fired when volume or muted state changes. |
| `ratechange` | `Event` | Fired when the playback rate changes. |
| `durationchange` | `Event` | Fired when the duration attribute/state changes. |
| `seeking` | `Event` | Fired when a seek operation begins. |
| `seeked` | `Event` | Fired when a seek operation completes. |
| `resize` | `Event` | Fired when the player dimensions change. |
| `loadstart` | `Event` | Fired when the browser starts looking for the media. |
| `loadedmetadata` | `Event` | Fired when the duration and dimensions of the media have been loaded. |
| `loadeddata` | `Event` | Fired when the first frame of the media has finished loading. |
| `canplay` | `Event` | Fired when the browser can start playing the media. |
| `canplaythrough` | `Event` | Fired when the browser estimates it can play through the media without buffering. |
| `error` | `CustomEvent` | Fired when an error occurs (network, decode, timeout). `detail` contains error info. |
| `enterpictureinpicture` | `Event` | Fired when the player enters Picture-in-Picture mode. |
| `leavepictureinpicture` | `Event` | Fired when the player leaves Picture-in-Picture mode. |
| `audiometering` | `CustomEvent` | Fired with audio level data when metering is active. `detail` contains `AudioLevels`. |

## C. Attributes

The component observes the following attributes:

| Attribute | Type | Description |
| :--- | :--- | :--- |
| `src` | `string` | URL of the Helios composition to load. |
| `width` | `number` | Width of the player in pixels. |
| `height` | `number` | Height of the player in pixels. |
| `autoplay` | `boolean` | If present, playback starts automatically when ready. |
| `loop` | `boolean` | If present, the composition loops upon reaching the end. |
| `controls` | `boolean` | If present, standard UI controls are displayed. |
| `muted` | `boolean` | If present, audio is initially muted. *Note: Client-side export prioritizes runtime `volume`/`muted` properties over attributes.* |
| `poster` | `string` | URL of an image to show while loading or before playback. |
| `preload` | `string` | Hints how much media to preload (`auto`, `none`). |
| `interactive` | `boolean` | If present, allows direct interaction with the iframe content (disables click-to-play layer). |
| `controlslist` | `string` | Space-separated tokens to hide UI features: `nodownload`, `nofullscreen`. |
| `disablepictureinpicture` | `boolean` | If present, hides the Picture-in-Picture button. |
| `sandbox` | `string` | Sandbox flags for the iframe (default: `allow-scripts allow-same-origin`). |
| `input-props` | `json` | JSON string of properties to pass to the Helios controller. |
| `export-mode` | `string` | Export strategy: `auto`, `canvas` (requires same-origin), or `dom`. |
| `canvas-selector` | `string` | CSS selector for the canvas element inside the composition (default: `canvas`). |
| `export-format` | `string` | Default format for client-side export: `mp4`, `webm`, `png`, `jpeg`. |
| `export-filename` | `string` | Default filename for exported files. |
| `export-width` | `number` | Target width for client-side exports (independent of player display size). |
| `export-height` | `number` | Target height for client-side exports. |
| `export-bitrate` | `number` | Target bitrate for video exports (in bps). |
| `export-caption-mode` | `string` | Caption handling during export: `burn-in` (default) or `file` (saves .srt). |
| `media-title` | `string` | Media Session metadata: Title. |
| `media-artist` | `string` | Media Session metadata: Artist. |
| `media-album` | `string` | Media Session metadata: Album. |
| `media-artwork` | `string` | Media Session metadata: Artwork URL. |

## D. Public API (HeliosPlayer)

```typescript
interface HeliosPlayer extends HTMLElement {
  // Standard Media API
  play(): Promise<void>;
  pause(): void;
  load(): void;
  canPlayType(type: string): CanPlayTypeResult;
  fastSeek(time: number): void;
  requestPictureInPicture(): Promise<PictureInPictureWindow>;

  // Properties
  currentTime: number;
  duration: number;
  paused: boolean;
  ended: boolean;
  volume: number;
  muted: boolean;
  playbackRate: number;
  currentSrc: string;
  src: string;
  error: MediaError | null;
  readyState: number;
  networkState: number;
  width: number;
  height: number;
  videoWidth: number;
  videoHeight: number;
  playsInline: boolean;

  // Tracks
  readonly textTracks: HeliosTextTrackList;
  readonly audioTracks: HeliosAudioTrackList;
  readonly videoTracks: HeliosVideoTrackList;
  addTextTrack(kind: string, label?: string, language?: string): HeliosTextTrack;

  // Helios Specific
  fps: number;
  currentFrame: number;
  inputProps: Record<string, any> | null;

  // Methods
  getController(): HeliosController | null;
  getSchema(): Promise<HeliosSchema | undefined>;
  diagnose(): Promise<DiagnosticReport>;
  export(options?: HeliosExportOptions): Promise<void>;
  captureStream(): Promise<MediaStream>;
  startAudioMetering(): void;
  stopAudioMetering(): void;
}
```
