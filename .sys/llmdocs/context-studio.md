# Studio Domain Context

## Section A: Architecture
Helios Studio is a web-based integrated development environment for video composition. It consists of:
- **CLI/Dev Server**: Express server providing hot-module replacement, asset discovery, and preview capabilities via an MCP server architecture.
- **Client Application**: A React-based web interface containing the video player stage, timeline, property controls, and asset management panels. It relies extensively on contexts to maintain player, layout, and component state.

## Section B: File Tree
```
packages/studio/
├── bin/
├── src/
│   ├── components/
│   │   ├── AssetsPanel.tsx
│   │   ├── CompositionsPanel.tsx
│   │   ├── Layout.tsx
│   │   ├── Stage.tsx
│   │   ├── Timeline.tsx
│   │   └── ...
│   ├── context/
│   │   ├── LayoutContext.tsx
│   │   └── StudioContext.tsx
│   ├── server/
│   │   └── mcp.ts
│   ├── ui/
│   └── main.tsx
└── package.json
```

## Section C: CLI Interface
- `npx helios studio`: Starts the Studio development server and opens the UI in the default browser.
- `npx helios serve`: Starts a production-like preview server.

## Section D: UI Components
- **Timeline**: Visual representation of the composition's time-based properties and assets. Supports drag-and-drop for mapping assets (video, audio) to composition inputs.
- **Stage**: The main preview area utilizing `<helios-player>`.
- **Properties**: Editor for the active composition's input schema.
- **AssetsPanel**: File browser for project assets.
- **CompositionsPanel**: File browser for available project compositions.

## Section E: Integration
- **packages/core**: Defines the underlying schemas and player structures.
- **packages/player**: Embeds the web component for playback preview.
- **packages/renderer**: Used for managing active render jobs initiated from the Studio interface.
