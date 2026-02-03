# Excalidraw Animation Example

This example demonstrates how to integrate [Excalidraw](https://excalidraw.com/) with Helios to create whiteboard-style animations.

## Key Concepts

- **Excalidraw Component**: Uses the React `<Excalidraw>` component to render the scene.
- **Scene Updates**: Updates the scene elements (`excalidrawAPI.updateScene`) on every frame based on `helios.currentTime`.
- **Custom Diagram Logic**: Generates Excalidraw elements (rectangles, arrows, text) programmatically in `src/diagram.js`.
- **Asset Handling**: Demonstrates how to handle Excalidraw assets (fonts) using a custom Vite plugin in `vite.build-example.config.js`.

## How it Works

The composition binds to the Helios timeline using `useVideoFrame`. It calculates the state of diagram elements (opacity, position) based on the current frame and updates the Excalidraw instance.
