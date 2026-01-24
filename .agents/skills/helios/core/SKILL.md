---
name: helios-core
description: Core API for Helios video engine. Use when creating compositions, managing timeline state, controlling playback, or subscribing to frame updates. Covers Helios class instantiation, play/pause/seek controls, state subscription, and DOM animation synchronization.
---

# Helios Core API

The `Helios` class is the headless logic engine for video compositions. It manages timeline state and provides frame-accurate control.

## Quick Start

```typescript
import { Helios } from '@helios-engine/core';

// Create instance with duration and fps
const helios = new Helios({
  duration: 10,  // seconds
  fps: 30
});

// Subscribe to state changes
const unsubscribe = helios.subscribe((state) => {
  console.log(`Frame: ${state.currentFrame}/${state.duration * state.fps}`);
});

// Control playback
helios.play();
helios.pause();
helios.seek(150);  // Jump to frame 150
```

## API Reference

### Constructor

```typescript
new Helios(options: HeliosOptions)

interface HeliosOptions {
  duration: number;           // Duration in seconds (must be >= 0)
  fps: number;               // Frames per second (must be > 0)
  autoSyncAnimations?: boolean;  // Auto-sync DOM animations to timeline
  animationScope?: HTMLElement;  // Scope for animation syncing
}
```

**Throws:**
- `Error` if `duration < 0`
- `Error` if `fps <= 0`

### State

```typescript
helios.getState(): Readonly<HeliosState>

interface HeliosState {
  duration: number;     // Duration in seconds
  fps: number;          // Frames per second
  currentFrame: number; // Current frame (0 to duration*fps)
  isPlaying: boolean;   // Playback state
}
```

### Playback Controls

```typescript
helios.play()   // Start playback (no-op if already playing)
helios.pause()  // Pause playback (no-op if already paused)
helios.seek(frame: number)  // Jump to specific frame (clamped to valid range)
```

### Subscription

```typescript
// Subscribe - callback fires immediately with current state, then on every change
const unsubscribe = helios.subscribe((state: HeliosState) => {
  // React to state changes
});

// Unsubscribe when done
unsubscribe();

// Or manually:
helios.unsubscribe(callback);
```

### Timeline Binding

For renderer integration—bind Helios to `document.timeline` when timeline is driven externally:

```typescript
helios.bindToDocumentTimeline()    // Start polling document.timeline.currentTime
helios.unbindFromDocumentTimeline() // Stop polling
```

### Diagnostics

```typescript
// Static method - check browser capabilities
const report = await Helios.diagnose();

interface DiagnosticReport {
  waapi: boolean;         // Web Animations API support
  webCodecs: boolean;     // VideoEncoder support (for canvas rendering)
  offscreenCanvas: boolean;
  userAgent: string;
}
```

## Common Patterns

### Frame-Based Rendering

```typescript
const helios = new Helios({ duration: 5, fps: 60 });

helios.subscribe(({ currentFrame, fps, duration }) => {
  const totalFrames = duration * fps;
  const progress = currentFrame / totalFrames;
  
  // Use progress (0-1) for animations
  element.style.opacity = progress;
});
```

### DOM Animation Sync

Automatically sync CSS/WAAPI animations to Helios timeline:

```typescript
const helios = new Helios({
  duration: 10,
  fps: 30,
  autoSyncAnimations: true,
  animationScope: document.querySelector('.composition')
});

// All CSS animations within .composition will sync to helios.seek()
helios.seek(150);  // Animations jump to 5s mark (150/30fps)
```

### Composition Component (React)

```typescript
function useVideoFrame() {
  const [state, setState] = useState(null);
  const heliosRef = useRef(null);

  useEffect(() => {
    heliosRef.current = new Helios({ duration: 10, fps: 30 });
    const unsub = heliosRef.current.subscribe(setState);
    return unsub;
  }, []);

  return { state, helios: heliosRef.current };
}
```

## Error Handling

```typescript
// Invalid options throw immediately
try {
  new Helios({ duration: -1, fps: 30 }); // Throws: "Duration must be non-negative"
} catch (e) {
  console.error(e.message);
}

try {
  new Helios({ duration: 10, fps: 0 }); // Throws: "FPS must be greater than 0"
} catch (e) {
  console.error(e.message);
}
```

## Source Files

- Main class: `packages/core/src/index.ts`
- Tests: `packages/core/src/index.test.ts`
