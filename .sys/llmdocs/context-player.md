# Context: Player

## A. Component Structure
- **Shadow DOM**:
  - `div.status-overlay` (Loading/Error feedback)
  - `div.poster-container` (Poster image + Big Play Button)
  - `iframe` (Sandboxed composition)
  - `div.click-layer` (Transparent overlay for standard interactions)
  - `div.captions-container` (Burn-in captions overlay)
  - `div.controls` (Playback controls)

## B. Attributes
- `src` (string): URL of the composition.
- `width` (number): Player width.
- `height` (number): Player height.
- `autoplay` (boolean): Auto-start playback.
- `loop` (boolean): Loop playback.
- `controls` (boolean): Show/hide controls.
- `muted` (boolean): Mute audio.
- `interactive` (boolean): Disable click layer to allow direct iframe interaction.
- `poster` (string): URL of poster image.
- `preload` (string): 'auto' or 'none'.
- `input-props` (string): JSON string of input properties.
- `export-format` (string): 'mp4' or 'webm'.
- `export-mode` (string): 'auto', 'canvas', or 'dom'.
- `canvas-selector` (string): CSS selector for canvas in 'canvas' mode.

## C. Events
- `play`: Playback started.
- `pause`: Playback paused.
- `ended`: Playback ended.
- `timeupdate`: Current time changed.
- `volumechange`: Volume or mute state changed.
- `ratechange`: Playback rate changed.
- `durationchange`: Duration changed.
- `error`: Error occurred.

## D. Public API
- `play(): Promise<void>`
- `pause(): void`
- `load(): void`
- `currentTime`: number (get/set)
- `duration`: number (get)
- `paused`: boolean (get)
- `ended`: boolean (get)
- `volume`: number (get/set)
- `muted`: boolean (get/set)
- `playbackRate`: number (get/set)
- `interactive`: boolean (get/set)
- `inputProps`: Record<string, any> (get/set)
- `getController(): HeliosController | null`
