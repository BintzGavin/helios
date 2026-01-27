# Web Animations API (WAAPI) Example

This example demonstrates how to use the standard [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API) with Helios.

## Key Concepts

- **Native Always Wins**: Helios supports native web technologies out of the box. You don't need a heavy animation library.
- **Auto Sync**: By setting `autoSyncAnimations: true` in the `Helios` constructor, the engine automatically:
  1. Finds all WAAPI animations on the page.
  2. Pauses them.
  3. Synchronizes their `currentTime` to the Helios timeline.

## Implementation

```javascript
// 1. Create animation using standard browser API
element.animate(keyframes, {
  duration: 4000,
  iterations: Infinity
});

// 2. Initialize Helios
const helios = new Helios({
  duration: 4,
  autoSyncAnimations: true // This does the magic
});
```

## Running

1. Run `npm run dev` in the root directory.
2. Navigate to the example in the browser.
