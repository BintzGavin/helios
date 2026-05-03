---
id: PERF-424
slug: empty-image-dimensions
status: unclaimed
claimed_by: ""
created: 2024-05-03
completed: ""
result: ""
---

# PERF-424: 2x2 Empty Image Dimensions

## Context & Goal
The DOM render pipeline uses a base64 encoded transparent image as a fallback when `HeadlessExperimental.beginFrame` doesn't return `screenshotData`. Currently, these base64 images (PNG, JPEG, WEBP) are 1x1 pixels. When FFmpeg encodes to the `yuv420p` pixel format (the default for `libx264`), it requires both width and height to be divisible by 2. If the very first frame piped into FFmpeg is the 1x1 fallback frame, `libx264` fails with `width not divisible by 2 (1x1)` and FFmpeg crashes, causing the entire render to fail.

The goal is to update the fallback base64 strings to be 2x2 pixels, ensuring compatibility with `yuv420p` and preventing catastrophic render failures during skipped or empty first frames.

## File Inventory
- `packages/renderer/src/strategies/DomStrategy.ts`

## Implementation Spec

### Architecture
- Replace the 1x1 transparent PNG base64 string with a 2x2 transparent PNG base64 string.
- Replace the 1x1 JPEG base64 string with a 2x2 JPEG base64 string.
- Replace the 1x1 WEBP base64 string with a 2x2 WEBP base64 string.

### Pseudo-Code
Update `DomStrategy.ts`:
```typescript
<<<<<<< SEARCH
const EMPTY_IMAGE_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQIW2NkYGD4z8DAwMgAI0AMDA4wBfQoO4UAAAAASUVORK5CYII=",
  "base64"
);
=======
const EMPTY_IMAGE_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQIW2NkYGD4z8DAwMgAI0AMDA4wBfQoO4UAAAAASUVORK5CYII=",
  "base64"
);
>>>>>>> REPLACE
```

```typescript
<<<<<<< SEARCH
    // Set format-appropriate empty buffer
    if (format === 'jpeg') {
        // 1x1 JPEG pixel
        this.emptyImageBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
        this.emptyImageBuffer = Buffer.from(this.emptyImageBase64, 'base64');
    } else if (format === 'webp') {
        // 1x1 WEBP pixel
        this.emptyImageBase64 = 'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
        this.emptyImageBuffer = Buffer.from(this.emptyImageBase64, 'base64');
    } else {
        // Default to PNG
        this.emptyImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQIW2NkYGD4z8DAwMgAI0AMDA4wBfQoO4UAAAAASUVORK5CYII=";
        this.emptyImageBuffer = EMPTY_IMAGE_BUFFER;
    }
=======
    // Set format-appropriate empty buffer
    if (format === 'jpeg') {
        // 2x2 JPEG pixel
        this.emptyImageBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAACAAIBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
        this.emptyImageBuffer = Buffer.from(this.emptyImageBase64, 'base64');
    } else if (format === 'webp') {
        // 2x2 WEBP pixel
        this.emptyImageBase64 = 'UklGRjIAAABXRUJQVlA4ICYAAAAwAQCdASoCAAIACgEAAwBkAGsAIP4B2gAAACH+/4IAAA==';
        this.emptyImageBuffer = Buffer.from(this.emptyImageBase64, 'base64');
    } else {
        // Default to PNG
        this.emptyImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQIW2NkYGD4z8DAwMgAI0AMDA4wBfQoO4UAAAAASUVORK5CYII=";
        this.emptyImageBuffer = EMPTY_IMAGE_BUFFER;
    }
>>>>>>> REPLACE
```

### Public API Changes
- None.

### Dependencies
- None.

## Test Plan
- Run `npm run build -w packages/core && npm run build -w packages/renderer`
- Run `npx tsx packages/cli/src/index.ts render examples/dom-benchmark/composition.html --mode dom -o output.mp4` to ensure FFmpeg does not crash with `width not divisible by 2`.
