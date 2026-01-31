---
title: "React Captions Animation"
description: "Learn how to synchronize SRT captions with React components."
---

# React Captions Animation

This example demonstrates how to parse SRT captions and synchronize them with a React component using a custom `useCaptions` hook.

## Overview

Helios provides built-in SRT parsing and state management for captions. By subscribing to the `activeCaptions` signal, we can create a reactive overlay that updates automatically as the composition plays.

## The Hook: `useCaptions`

We can create a simple hook that subscribes to Helios and returns the currently active caption cues.

```javascript
import { useState, useEffect } from 'react';

export function useCaptions(helios) {
  // Initialize with current value
  const [captions, setCaptions] = useState(helios.activeCaptions.value);

  useEffect(() => {
    // Subscribe to updates
    const unsubscribe = helios.subscribe((state) => {
      setCaptions(state.activeCaptions);
    });

    return unsubscribe;
  }, [helios]);

  return captions;
}
```

## Usage in Component

The overlay component consumes the hook and renders the cues.

```jsx
import React from 'react';
import { useCaptions } from './hooks/useCaptions';

export function CaptionOverlay({ helios }) {
  const activeCaptions = useCaptions(helios);

  if (!activeCaptions || activeCaptions.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: '50px',
      textAlign: 'center',
      width: '100%'
    }}>
      {activeCaptions.map((cue, index) => (
        <div key={index} className="caption-bubble">
          {cue.text}
        </div>
      ))}
    </div>
  );
}
```

## Setup

Initialize Helios with your SRT content.

```javascript
import { Helios } from '@helios-project/core';

const srtContent = `
1
00:00:00,500 --> 00:00:02,000
Hello, welcome to Helios!
`;

const helios = new Helios({
  width: 1920,
  height: 1080,
  fps: 30,
  duration: 5,
  captions: srtContent, // Pass SRT string here
  autoSyncAnimations: true
});
```
