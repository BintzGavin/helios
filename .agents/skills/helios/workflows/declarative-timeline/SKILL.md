---
name: declarative-timeline
description: How to use the Declarative Timeline feature to manage clips and sequencing. Use when you have a complex composition with multiple tracks and overlapping clips.
---

# Declarative Timeline

Helios supports a declarative timeline API that allows you to define tracks and clips in a data structure. The core engine then calculates which clips are active at the current time, simplifying state management for complex sequences.

## Quick Start

```typescript
import { Helios } from '@helios-project/core';

const helios = new Helios({
  duration: 10,
  fps: 30,
  timeline: {
    tracks: [
      {
        id: 'main-track',
        clips: [
          { id: 'clip-1', source: 'intro.mp4', start: 0, duration: 2 },
          { id: 'clip-2', source: 'scene.mp4', start: 2, duration: 5 }
        ]
      },
      {
        id: 'overlay-track',
        clips: [
          { id: 'logo', source: 'logo.png', start: 0, duration: 10, props: { opacity: 0.5 } }
        ]
      }
    ]
  }
});

// Subscribe to active clips
helios.activeClips.subscribe((clips) => {
  console.log("Active Clips:", clips.map(c => c.id));
  // Render clips...
});
```

## Key Patterns

### React Integration

In React, you can map `activeClips` directly to components.

```tsx
import { useSignal } from '@helios-project/react'; // Hypothetical or custom hook

function Composition({ helios }) {
  const activeClips = useSignal(helios.activeClips);

  return (
    <div className="composition">
      {activeClips.map((clip) => (
        <ClipRenderer key={clip.id} clip={clip} />
      ))}
    </div>
  );
}

function ClipRenderer({ clip }) {
  // Logic to render based on clip.source type
  if (clip.source.endsWith('.mp4')) {
    return <video src={clip.source} ... />;
  }
  return <img src={clip.source} ... />;
}
```

### Dynamic Timeline Updates

You can update the timeline at runtime, useful for editors or dynamic generation.

```typescript
helios.setTimeline({
  tracks: [
    {
      id: 'dynamic-track',
      clips: generateClipsFromData(myData)
    }
  ]
});
```

## Data Structures

### HeliosClip
```typescript
interface HeliosClip {
  id: string;      // Unique identifier
  source: string;  // Asset source (URL, path, or identifier)
  start: number;   // Start time in seconds
  duration: number;// Duration in seconds
  props?: Record<string, any>; // Custom properties for the renderer
}
```

### HeliosTimeline
```typescript
interface HeliosTimeline {
  tracks: HeliosTrack[];
}

interface HeliosTrack {
  id: string;
  name?: string;
  clips: HeliosClip[];
}
```
