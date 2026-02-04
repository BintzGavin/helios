---
title: "React Components"
description: "Using standard registry components in React"
---

# React Components

This example demonstrates how to use the standard components installed via the CLI (`helios add`) in a React project.

## Components

The standard registry includes:
- **Timer**: A countdown/countup timer.
- **ProgressBar**: A visual progress bar synced to the timeline.
- **Watermark**: A simple watermark overlay.

## Installation

```bash
helios add Timer
helios add ProgressBar
helios add Watermark
```

## Usage

```tsx
import React from 'react';
import { Timer } from './components/Timer';
import { ProgressBar } from './components/ProgressBar';
import { Watermark } from './components/Watermark';
import { helios } from './helios'; // Your Helios instance

export function App() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#333' }}>

      {/* Timer centered */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
        <Timer helios={helios} mode="countdown" />
      </div>

      {/* Progress Bar at bottom */}
      <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
        <ProgressBar helios={helios} height={10} color="#007bff" />
      </div>

      {/* Watermark at top right */}
      <Watermark text="Helios Demo" position="top-right" opacity={0.5} />

    </div>
  );
}
```
