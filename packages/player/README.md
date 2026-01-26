# Helios Player

The `@helios-project/player` package provides the `<helios-player>` Web Component, a drop-in UI for reviewing and exporting Helios compositions.

## Installation

```bash
npm install @helios-project/player
```

## Usage

### Host Page

Import the player and use the custom element in your HTML.

```html
<script type="module">
  import "@helios-project/player";
</script>

<helios-player
  src="path/to/composition.html"
  width="1920"
  height="1080"
  controls
  autoplay
></helios-player>
```

### Connecting the Composition

For the player to control your composition, the composition page (inside the iframe) must connect to the parent window.

**If you are using `packages/core` directly:**

```javascript
import { Helios } from "@helios-project/core";
import { connectToParent } from "@helios-project/player/bridge";

const helios = new Helios({ ... });

// Initialize the bridge
connectToParent(helios);
```

**If you are using `window.helios` (Legacy/Direct Mode):**

The player will automatically attempt to access `window.helios` on the iframe's content window if it's on the same origin. However, `connectToParent` is the recommended approach for cross-origin support and sandboxing.

## Attributes

| Attribute | Description | Default |
|---|---|---|
| `src` | URL of the composition page to load in the iframe. | (Required) |
| `width` | Width of the player (aspect ratio calculation). | - |
| `height` | Height of the player (aspect ratio calculation). | - |
| `autoplay` | Automatically start playback when connected. | `false` |
| `loop` | Loop playback when the end is reached. | `false` |
| `controls` | Show the UI controls overlay. | `false` |
| `export-mode` | Strategy for client-side export: `auto`, `canvas`, or `dom`. | `auto` |
| `canvas-selector` | CSS selector for the canvas element (used in `canvas` export mode). | `canvas` |

## Client-Side Export

The player supports exporting the composition to video (MP4/WebM) directly in the browser using WebCodecs.

- **`export-mode="canvas"`**: captures frames from a `<canvas>` element. Fast and efficient.
- **`export-mode="dom"`**: captures the entire DOM using `foreignObject` SVG serialization. Useful for compositions using DOM elements (divs, text, css).
- **`export-mode="auto"`**: attempts to detect the best strategy.

Configuration:

```html
<helios-player
  src="..."
  export-mode="dom"
></helios-player>
```
