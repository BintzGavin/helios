# Context: Player (Web Component)

## A. Component Structure
The `<helios-player>` Web Component utilizes a Shadow DOM structure acting as a "Remote Control" for the composition in the iframe.

**Shadow DOM Layout**:
```
:host
├── iframe (part="iframe")
└── div.controls
    ├── button.play-pause-btn (part="play-pause-button")
    ├── button.export-btn (part="export-button")
    ├── input.scrubber (type="range", part="scrubber")
    └── div.time-display (part="time-display")
```

## B. Events
The component does not currently dispatch custom events. It listens for interactions and drives the `window.helios` instance within the iframe.

## C. Attributes
- **`src`**: The URL of the composition to load within the iframe.
