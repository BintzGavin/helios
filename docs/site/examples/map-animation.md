---
title: "Map Animation (Leaflet)"
description: "Integrating Leaflet.js maps with Helios"
---

# Map Animation (Leaflet)

This example demonstrates how to integrate [Leaflet.js](https://leafletjs.com/) with Helios to create data-driven map animations.

## Key Concepts

- **Stability Checks**: Using `registerStabilityCheck` to wait for map tiles to load before capturing frames.
- **External Timeline**: Using `bindToDocumentTimeline` to sync Helios with the browser's animation timeline.
- **Data Interpolation**: Interpolating latitude/longitude coordinates based on current playback time.

## Implementation

The implementation registers a stability check that ensures tiles are ready. In a real-world scenario, you would hook into Leaflet's tile loading events.

```typescript
// src/main.ts
import { Helios } from '@helios-project/core';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ... Leaflet icon setup ...

// Init Helios
const helios = new Helios({ duration: 5, fps: 30 });
helios.bindToDocumentTimeline();

// Stability Check: Wait for tiles
helios.registerStabilityCheck(() => {
   return new Promise<void>(resolve => {
       // Simple buffer for demo - in production, check L.TileLayer loading state
       setTimeout(resolve, 100);
   });
});

// Animation Loop
helios.subscribe(state => {
    const t = state.currentFrame / helios.fps;

    // Interpolate position based on time
    // ... logic to calculate lat/lng ...

    map.setView([lat, lng], 13, { animate: false });
});
```

## Vite Configuration

When using Leaflet with Vite, you may need to manually fix icon paths:

```typescript
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;
```
