---
title: "React Transitions"
description: "Synchronizing React CSS animations with Helios"
---

# React Transitions

This example demonstrates how to synchronize CSS animations in a React application with the Helios timeline using `autoSyncAnimations`.

## Concept

The `autoSyncAnimations: true` option tells Helios to take control of the document's timeline. This means any CSS animation (triggered by classes) or WAAPI animation will be paused and seeked automatically to match the `currentFrame` of Helios.

## Implementation

### Initialization

Initialize Helios outside your component or in a singleton to persist state.

```tsx
import React, { useEffect, useState } from 'react';
import { Helios } from '@helios-project/core';
import { Sequence } from './components/Sequence';

const helios = new Helios({
  fps: 30,
  duration: 7,
  autoSyncAnimations: true // Syncs CSS animations to global time
});

// Bind to document timeline for Studio/Renderer compatibility
helios.bindToDocumentTimeline();

function App() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const unsubscribe = helios.subscribe((state) => {
        setFrame(state.currentFrame);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="container">
       {/* Sequences control mounting/unmounting or visibility */}
       <Sequence from={0} duration={90} currentFrame={frame}>
          <div className="scene scene-1">
             <h1>Scene 1</h1>
          </div>
       </Sequence>
    </div>
  );
}
```

### CSS Setup

Define standard CSS animations. Note that you don't need special JavaScript logic to seek them; Helios handles the timeline synchronization.

```css
.scene-1 h1 {
  animation: fadeIn 1s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
```
