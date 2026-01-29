# 2025-02-23-DEMO-MapAnimation.md

## 1. Context & Goal
- **Objective**: Create a "Map Animation" example using `leaflet` to demonstrate geospatial data visualization, stability checks for async assets, and marker-based navigation.
- **Trigger**: Vision gap ("Use What You Know" -> Leaflet/Maps) and lack of examples for `registerStabilityCheck` (Core feature).
- **Impact**: Demonstrates advanced DOM integration (Maps), verifying robust rendering with async tile loading, and utilizing Core's `markers` signal.

## 2. File Inventory
- **Create**:
    - `examples/map-animation/package.json`: Dependencies (`leaflet`, `@types/leaflet`).
    - `examples/map-animation/vite.config.js`: Vite config with CSS support.
    - `examples/map-animation/composition.html`: Entry point.
    - `examples/map-animation/src/main.ts`: Main logic (Helios + Leaflet).
    - `examples/map-animation/src/style.css`: Basic styles.
- **Modify**:
    - `vite.build-example.config.js`: Add `map_animation` to build inputs.
- **Read-Only**:
    - `packages/core/src/index.ts`: Reference for `Helios` API.

## 3. Implementation Spec

### Architecture
- **Framework**: Vanilla JS (Lightweight, focuses on Leaflet API).
- **Bundler**: Vite (Standard).
- **Libraries**:
    - `leaflet`: For map rendering.
    - `helios-core`: For timing and stability.

### Pseudo-Code (`src/main.ts`)
```typescript
import { Helios } from '@helios-engine/core';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './style.css';

// Fix Leaflet icon paths for Vite (Common "Use What You Know" issue)
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Init Map
// Use a neutral container ID
const map = L.map('map', {
    zoomControl: false, // Cleaner for video
    attributionControl: false // Cleaner for video (add custom if needed)
}).setView([51.505, -0.09], 13);

// Use OSM Tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Route Data (London -> Paris -> Berlin)
// Array of { lat, lng, time }
const route = [
  { lat: 51.505, lng: -0.09, time: 0 }, // London
  { lat: 48.8566, lng: 2.3522, time: 5 } // Paris
];

// Init Helios
const helios = new Helios({ duration: 5, fps: 30 });

// Stability Check: Wait for tiles
// Leaflet doesn't have a simple "all tiles loaded" promise, but we can hook into events.
// This demonstrates how to adapt 3rd party async loading to Helios.
helios.registerStabilityCheck(() => {
   return new Promise<void>(resolve => {
       // If map is already idle (no active tile requests), resolve immediately.
       // Note: This is a simplified check. A robust production check might count 'tileloadstart' vs 'tileload'.
       // For this demo, we'll wait for a short buffer or 'load' event if mostly static.

       // Better approach: resolving immediately for now to avoid complexity in demo,
       // but documenting where the check goes.
       // Real implementation:
       // if (!mapHasLoadingTiles) resolve();
       // else map.on('tileload', check);

       setTimeout(resolve, 100); // Simple buffer for demo
   });
});

// Interpolation Helper
function interpolate(start, end, progress) {
    return start + (end - start) * progress;
}

// Animation Loop
helios.subscribe(state => {
    const t = state.currentFrame / helios.fps;

    // Find segment
    // (Simplified: assumes 1 segment for demo)
    const p1 = route[0];
    const p2 = route[1];
    const duration = p2.time - p1.time;
    const progress = Math.max(0, Math.min(1, (t - p1.time) / duration));

    const lat = interpolate(p1.lat, p2.lat, progress);
    const lng = interpolate(p1.lng, p2.lng, progress);

    map.setView([lat, lng], 13, { animate: false });
    // Update marker if exists
});
```

### Build Config Update (`vite.build-example.config.js`)
- Insert `map_animation: resolve(__dirname, "examples/map-animation/composition.html"),` into the `rollupOptions.input` object.

## 4. Test Plan
- **Verification**:
    1.  `npm install` (to install leaflet).
    2.  `npm run build:examples` (verify build success).
    3.  `npx ts-node --esm tests/e2e/verify-render.ts` (Manual verification step).
- **Success Criteria**:
    - Build output contains `map_animation` entry.
    - Rendered video/screenshot shows a map.
- **Edge Cases**:
    - Network failure for tiles (acceptable for local dev, but note for CI).
