# Context: PLAYER

**Version**: v0.76.23

## Section A: Component Structure

`<helios-player>` is a Web Component that uses Shadow DOM.

### DOM Layout
```html
<helios-player>
  #shadow-root
    <style>...</style>
    <slot></slot>

    <!-- Menus (Hidden by default) -->
    <div class="audio-menu hidden" part="audio-menu" id="audio-menu-container"></div>
    <div class="settings-menu hidden" part="settings-menu" id="settings-menu-container"></div>
    <div class="export-menu hidden" part="export-menu" id="export-menu-container"></div>

    <!-- Overlays -->
    <div class="shortcuts-overlay hidden" part="shortcuts-overlay">...</div>
    <div class="debug-overlay hidden" part="debug-overlay">...</div>
    <div class="status-overlay hidden" part="overlay">...</div>

    <!-- Poster / Initial State -->
    <div class="poster-container hidden" part="poster">...</div>

    <!-- Picture in Picture Support -->
    <video class="pip-video" playsinline muted autoplay></video>

    <!-- Core Preview -->
    <iframe part="iframe" sandbox="allow-scripts allow-same-origin"></iframe>

    <!-- Interaction Layer -->
    <div class="click-layer" part="click-layer"></div>

    <!-- Captions Overlay -->
    <div class="captions-container" part="captions"></div>

    <!-- Bottom Controls Bar -->
    <div class="controls" part="controls" role="toolbar">
      <button class="play-pause-btn" part="play-pause-button">...</button>
      <div class="volume-control" part="volume-control">...</div>
      <button class="audio-btn" part="audio-button">...</button>
      <button class="cc-btn" part="cc-button">...</button>
      <button class="export-btn" part="export-button">...</button>
      <div class="scrubber-wrapper" part="scrubber-wrapper">...</div>
      <div class="time-display" part="time-display">0.00 / 0.00</div>
      <button class="fullscreen-btn" part="fullscreen-button">...</button>
      <button class="pip-btn" part="pip-button">...</button>
      <button class="settings-btn" part="settings-button">...</button>
    </div>
</helios-player>
```

## Section B: Events

- `play`: Dispatched when playback starts.
- `pause`: Dispatched when playback is paused.
- `timeupdate`: Dispatched when the current frame/time changes.
- `ended`: Dispatched when playback reaches the end of the timeline.
- `seeking`: Dispatched while scrubbing the timeline or initiating a seek.
- `seeked`: Dispatched after a seek operation completes.
- `volumechange`: Dispatched when the volume slider is adjusted or muted.
- `ratechange`: Dispatched when the playback rate changes.
- `durationchange`: Dispatched when the duration of the composition changes.
- `resize`: Dispatched when the compositional dimensions change.
- `loadstart`: Dispatched when beginning to load a new source.
- `loadedmetadata`: Dispatched when compositional metadata (duration, dimensions) is known.
- `canplay`: Dispatched when the composition can begin playing.
- `canplaythrough`: Dispatched when the composition can likely play through without buffering.
- `error`: Dispatched when a loading or connection error occurs.
- `enterpictureinpicture`: Dispatched when PiP is activated.
- `leavepictureinpicture`: Dispatched when PiP is deactivated.
- `audiometering`: Custom event dispatched when audio levels are calculated.

## Section C: Attributes

- `src`: The URL of the Helios composition to load.
- `width`: Overrides the preview width (Standard Media API parity).
- `height`: Overrides the preview height (Standard Media API parity).
- `autoplay`: If present, begins playback automatically upon connection.
- `loop`: If present, loops playback continuously.
- `muted`: If present, silences audio.
- `controls`: If present, displays the bottom control bar.
- `interactive`: If present, removes pointer-events from the click layer, allowing interaction with elements inside the iframe.
- `poster`: Image URL to display while connecting or loading.
- `preload`: Indicates caching behavior (`none`, `metadata`, `auto`).
- `controlslist`: Allows hiding specific UI elements (e.g., `nodownload`, `nofullscreen`).
- `sandbox`: Overrides the default iframe sandbox flags.
- `disablepictureinpicture`: If present, hides the PiP button.

**Export Specific Attributes:**
- `export-mode`: "auto" (default), "canvas", or "dom".
- `export-format`: Target export format (e.g., "mp4", "webm").
- `export-filename`: Default filename for the downloaded file.
- `export-width`: Target width for the final export.
- `export-height`: Target height for the final export.
- `export-bitrate`: Target bitrate (in Mbps).
- `export-caption-mode`: "burn-in" (default) or "file" (.srt).
- `canvas-selector`: CSS selector used to find the target canvas in the iframe (defaults to `canvas`).

## Section D: Methods

- `play(): Promise<void>`
- `pause(): void`
- `load(): void`
- `export(options?: HeliosExportOptions): Promise<void>`
- `diagnose(): Promise<DiagnosticReport>`
- `captureStream(): Promise<MediaStream>`
- `addTextTrack(kind: string, label?: string, language?: string): HeliosTextTrack`
- `requestPictureInPicture(): Promise<PictureInPictureWindow>`
- `startAudioMetering(): void`
- `stopAudioMetering(): void`