---
title: "Advanced Features"
description: "Advanced capabilities: Signals, Captions, Dynamic Props"
---

# Advanced Features

## Signals

Helios Core uses **Signals** for reactive state management. This allows for fine-grained updates without re-rendering the entire component tree on every frame.

### Basic Usage

```typescript
import { signal, computed, effect } from '@helios-project/core';

const count = signal(0);
const double = computed(() => count.value * 2);

effect(() => {
  console.log(`Count: ${count.value}, Double: ${double.value}`);
});

count.value = 1; // Logs: Count: 1, Double: 2
```

In a React component, you can bind signals to styles or text content directly to bypass React's render cycle for high-performance animation.

## Captions (SRT)

Helios has built-in support for parsing and displaying captions from SRT (SubRip Subtitle) files.

### Loading Captions

You can pass captions to the constructor or set them later.

```typescript
const helios = new Helios({
  // ...
  captions: `
1
00:00:00,000 --> 00:00:02,000
Hello World

2
00:00:02,500 --> 00:00:04,000
This is a caption.
  `
});
```

### Displaying Captions

Helios provides an `activeCaptions` signal that contains the cues active at the current frame.

```tsx
// React Example
const { activeCaptions } = useHelios();

return (
  <div className="captions-overlay">
    {activeCaptions.map(cue => (
      <div key={cue.id}>{cue.text}</div>
    ))}
  </div>
);
```

The `<helios-player>` also has a built-in "CC" button that toggles a default caption overlay.

## Dynamic Properties (`inputProps`)

You can create parameterized compositions that accept data at runtime (or render time).

### Schema Definition

Define a schema to validate inputs.

```typescript
const schema = {
  title: { type: 'string', default: 'Default Title' },
  accentColor: { type: 'string', default: '#007bff' }
};

const helios = new Helios({ schema, ... });
```

### Using Props

Access props via `helios.inputProps.value`.

```typescript
const title = helios.inputProps.value.title;
```

### Injecting Props

- **In Player**: Use the `input-props` attribute.
  ```html
  <helios-player input-props='{"title":"My Video"}' ...></helios-player>
  ```
- **In Renderer**: Pass `inputProps` to options.
  ```typescript
  new Renderer({
    inputProps: { title: "Rendered Video" },
    // ...
  });
  ```

## Media Elements

Syncing native `<video>` and `<audio>` elements with the main timeline can be tricky due to browser restrictions (autoplay policies, loading states).

Helios provides a `DomDriver` (enabled via `autoSyncAnimations: true` or manually) that attempts to keep media elements in sync.

For best results:
1.  Ensure media is loaded/buffered.
2.  Use the `media-element-animation` example pattern where you force the `currentTime` of the media element to match the Helios time in a `requestAnimationFrame` loop or effect.

```javascript
videoElement.currentTime = currentFrame / fps;
```

Note that for exact frame-accurate rendering, the Renderer handles media elements by extracting their frames or audio tracks separately.
