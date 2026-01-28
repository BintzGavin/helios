# Context: PLAYER (`packages/player`)

## A. Component Structure
The `<helios-player>` Web Component utilizes a Shadow DOM with the following structure:
- **Wrapper**: Container for aspect ratio management.
- **Iframe**: Sandboxed iframe loading the Helios composition (`src`).
- **Poster Container**: Displays the poster image and Big Play Button when not playing.
- **Status Overlay**: Displays "Loading...", "Connecting...", or error messages.
- **Click Layer**: Transparent overlay to handle click-to-play/pause and double-click fullscreen.
- **Captions Container**: Renders burn-in captions over the video.
- **Controls Overlay**: Flexbox toolbar containing:
  - Play/Pause Button
  - Volume Toggle & Slider
  - CC Toggle
  - Export Button
  - Speed Selector
  - Scrubber (Range Input)
  - Time Display
  - Fullscreen Toggle

## B. Events
The component dispatches standard HTMLMediaElement events:
- `play`: Playback has started.
- `pause`: Playback has paused.
- `ended`: Playback has reached the end.
- `timeupdate`: The `currentTime` has changed.
- `volumechange`: Volume or Mute state has changed.
- `ratechange`: Playback rate has changed.
- `durationchange`: The duration attribute has been updated.
- `loadstart`: The user agent has begun looking for media data (src changed).
- `loadedmetadata`: The metadata has been loaded.
- `loadeddata`: The first frame of the media has finished loading.
- `canplay`: The browser can resume playback of the media data.
- `canplaythrough`: The browser estimates it can play the media up to its end without stopping for content buffering.
- `error`: An error occurred (detail contains error info).

## C. Attributes & Properties
### Attributes
- `src`: URL of the Helios composition to load.
- `width`, `height`: Aspect ratio dimensions.
- `autoplay`: Boolean attribute to start playback automatically.
- `loop`: Boolean attribute to loop playback.
- `controls`: Boolean attribute to show/hide UI controls.
- `muted`: Boolean attribute to default to muted state.
- `poster`: URL of an image to show while downloading.
- `preload`: Hint to the user agent (`auto`, `metadata`, `none`).
- `interactive`: Boolean attribute to enable direct interaction with the iframe content.
- `export-mode`: `auto` (default), `dom`, or `canvas`.
- `export-format`: `mp4` (default) or `webm`.
- `canvas-selector`: CSS selector for the canvas (default: `canvas`).
- `input-props`: JSON string of properties to pass to the controller.

### Properties (Getters/Setters)
- `currentTime` (number)
- `duration` (readonly number)
- `paused` (readonly boolean)
- `ended` (readonly boolean)
- `volume` (number 0-1)
- `muted` (boolean)
- `playbackRate` (number)
- `currentFrame` (number)
- `fps` (readonly number)
- `readyState` (readonly number)
- `networkState` (readonly number)
- `inputProps` (object)

## D. Constants
### Ready States
- `HAVE_NOTHING` (0)
- `HAVE_METADATA` (1)
- `HAVE_CURRENT_DATA` (2)
- `HAVE_FUTURE_DATA` (3)
- `HAVE_ENOUGH_DATA` (4)

### Network States
- `NETWORK_EMPTY` (0)
- `NETWORK_IDLE` (1)
- `NETWORK_LOADING` (2)
- `NETWORK_NO_SOURCE` (3)
