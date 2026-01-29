# Context: PLAYER

## Identity
- **Role**: Frontend / Player Agent
- **Domain**: `packages/player`
- **Responsibility**: `<helios-player>` Web Component, UI controls, iframe bridge.

## A. Component Structure
The `<helios-player>` component uses a Shadow DOM with the following structure:
- **Style**: Scoped CSS.
- **Status Overlay**: Displays "Connecting...", "Loading...", or Error messages.
- **Poster Container**: Displays poster image and "Big Play Button".
- **Iframe**: Sandbox for the composition (`allow-scripts allow-same-origin`).
- **Click Layer**: Transparent overlay for click-to-play/pause interactions.
- **Captions Container**: Overlays active captions.
- **Controls**:
    - Play/Pause Button
    - Volume Control (Mute Button + Slider)
    - CC Button (Toggle Captions)
    - Export Button (Client-side WebCodecs export)
    - Speed Selector (0.25x - 2x)
    - Scrubber (Range input)
    - Time Display (Current / Total)
    - Fullscreen Button

## B. Events
The component dispatches standard HTMLMediaElement events:
- **Playback**: `play`, `pause`, `ended`, `seeking`, `seeked`
- **Time**: `timeupdate`, `durationchange`
- **State**: `ratechange`, `volumechange`
- **Lifecycle**: `loadstart`, `loadedmetadata`, `loadeddata`, `canplay`, `canplaythrough`
- **Error**: `error`

## C. Attributes
- **src**: URL of the composition (iframe source).
- **width**: Player width (pixels).
- **height**: Player height (pixels).
- **autoplay**: Boolean attribute (starts playback automatically).
- **loop**: Boolean attribute (loops playback).
- **controls**: Boolean attribute (shows/hides UI).
- **muted**: Boolean attribute (initial mute state).
- **poster**: URL of image to show before playback.
- **preload**: `auto` | `none` (defaults to `auto`).
- **interactive**: Boolean attribute (disables click layer to allow iframe interaction).
- **input-props**: JSON string of properties to pass to the composition.
- **export-format**: `mp4` | `webm` (defaults to `mp4`).
- **canvas-selector**: CSS selector for canvas to capture (export mode).

## D. Properties
The component implements the `HTMLMediaElement` interface (partial):
- **Playback**: `play()`, `pause()`, `currentTime`, `duration`, `paused`, `ended`, `playbackRate`, `loop`, `autoplay`, `muted`, `volume`
- **State**: `readyState`, `networkState`, `error`, `src`, `currentSrc`, `preload`, `buffered`, `seekable`, `seeking`, `played`
- **Video**: `videoWidth`, `videoHeight`, `poster`
- **Helios Specific**: `currentFrame`, `fps`, `interactive`, `inputProps`
