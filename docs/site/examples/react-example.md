---
title: "React Example"
description: "How to use Helios with React."
---

# React Example

This example demonstrates how to integrate Helios with React using a custom hook.

## The Hook: `useVideoFrame`

We create a hook to subscribe to Helios updates and trigger React re-renders.

```javascript
// useVideoFrame.js
import { useState, useEffect } from 'react';

export function useVideoFrame(helios) {
    const [frame, setFrame] = useState(helios.getState().currentFrame);

    useEffect(() => {
        // Update local state when helios state changes
        const update = (state) => setFrame(state.currentFrame);

        // Subscribe returns an unsubscribe function
        return helios.subscribe(update);
    }, [helios]);

    return frame;
}
```

## The Component

We use the hook to drive styles.

```jsx
// App.jsx
import React from 'react';
import { Helios } from '@helios-project/core';
import { useVideoFrame } from './hooks/useVideoFrame';

const duration = 5;
const fps = 30;
const helios = new Helios({ duration, fps });

// Bind to document timeline
helios.bindToDocumentTimeline();

export default function App() {
    const frame = useVideoFrame(helios);

    // Calculate animation values
    // Opacity 0->1 over first second (30 frames)
    const opacity = Math.min(1, frame / 30);

    return (
        <div style={{
            opacity: opacity,
            width: 200,
            height: 200,
            backgroundColor: '#61dafb'
        }}>
            Frame: {frame.toFixed(2)}
        </div>
    );
}
```
