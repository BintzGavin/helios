# Context: Player (`packages/player`)

## A. Component Structure
The `<helios-player>` Web Component encapsulates an iframe and a control overlay within its Shadow DOM.
- **Shadow Root**:
  - `<iframe>`: Loads the composition (url set via `src`).
  - `.controls`: Overlay containing playback controls.
    - `.play-pause-btn`: Toggles playback.
    - `.scrubber`: Input range for seeking.
    - `.time-display`: Shows current time/total duration.
    - `.export-btn`: Triggers client-side export.

## B. Events
- No custom events are currently dispatched by the component.
- The component listens for `load` on the internal iframe to bind to the remote `window.helios` instance.

## C. Attributes
- `src`: The URL of the composition to load in the iframe.
