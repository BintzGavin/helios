# Context: Player (Web Component)

## A. Component Structure
The `<helios-player>` is a Web Component that hosts the animation in an isolated iframe.
**Shadow DOM**:
```html
<div class="status-overlay">...</div> <!-- Connecting/Error states -->
<iframe sandbox="allow-scripts allow-same-origin"></iframe> <!-- The Content -->
<div class="controls">...</div> <!-- Play/Pause/Seek UI -->
```

## B. Communication Protocol (Bridge)
The Player communicates with the iframe content (which must use the `bridge` helper) via `window.postMessage`.

**Commands (Player -> Iframe)**:
- `HELIOS_CONNECT`: Handshake initiation.
- `HELIOS_PLAY`: Resume playback.
- `HELIOS_PAUSE`: Pause playback.
- `HELIOS_SEEK`: Jump to a specific frame.

**Events (Iframe -> Player)**:
- `HELIOS_READY`: Confirmation of connection.
- `HELIOS_STATE`: Updates the player UI with `currentFrame`, `isPlaying`, etc.

## C. Attributes
- `src`: The URL of the Helios composition to load.
