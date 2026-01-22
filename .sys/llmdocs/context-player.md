# Context: Player

## Section A: Component Structure
The `<helios-player>` web component uses a Shadow DOM with the following structure:
- Wrapper (Host)
  - Iframe (`part="iframe"`, `sandbox="allow-scripts allow-same-origin"`)
  - Controls Overlay (`.controls`)
    - Play/Pause Button
    - Export Button
    - Scrubber
    - Time Display

## Section B: Events
The component does not explicitly dispatch custom DOM events. It communicates via `postMessage`:
- Sends: `HELIOS_CONNECT`, `HELIOS_PLAY`, `HELIOS_PAUSE`, `HELIOS_SEEK`.
- Receives: `HELIOS_READY`, `HELIOS_STATE`.

## Section C: Attributes
- `src`: The URL of the composition to load in the iframe.
