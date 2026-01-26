# Plan: Scaffold Lottie Animation Example

## 1. Context & Goal
- **Objective**: Create a new example project `examples/lottie-animation` that demonstrates how to integrate Lottie animations (`lottie-web`) with the Helios engine.
- **Trigger**: Vision gap - The "Use What You Know" promise implies support for standard web animation formats like Lottie, which is currently missing.
- **Impact**: Provides a reference implementation for a major use case (Motion Graphics), proving Helios can drive third-party animation libraries via `subscribe()`.

## 2. File Inventory
- **Create**:
    - `examples/lottie-animation/composition.html`: Entry point for the example.
    - `examples/lottie-animation/src/main.ts`: Application logic (Lottie setup + Helios subscription).
    - `examples/lottie-animation/src/animation.json`: A minimal, valid Lottie JSON file (moving shape).
- **Modify**:
    - `vite.build-example.config.js`: Add the new entry point to the build configuration.
    - `tests/e2e/verify-render.ts`: Add the new test case to the verification script.
- **Read-Only**:
    - `packages/core/src/index.ts`: To reference Helios API if needed.

## 3. Implementation Spec
- **Dependencies**:
    - Run `npm install lottie-web --save-dev` in the project root.
- **Architecture**:
    - Use `lottie-web` (SVG renderer) to render the animation.
    - Use `Helios` core to manage time.
    - Use `helios.subscribe()` to sync Lottie's playback time using `anim.goToAndStop(time, false)`.
    - Use `mode: 'dom'` for rendering (Playwright screenshots).

### 3.1 Code Changes

**1. Create `examples/lottie-animation/composition.html`**:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Lottie Animation</title>
    <style>
      body {
        margin: 0;
        background: white;
        overflow: hidden;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
      }
      #lottie-container {
        width: 100%;
        height: 100%;
      }
    </style>
  </head>
  <body>
    <div id="lottie-container"></div>
    <script type="module" src="./src/main.ts"></script>
  </body>
</html>
```

**2. Create `examples/lottie-animation/src/animation.json`**:
```json
{"v":"5.5.7","fr":30,"ip":0,"op":60,"w":100,"h":100,"nm":"Square","ddd":0,"assets":[],"layers":[{"ddd":0,"ind":1,"ty":4,"nm":"Shape Layer 1","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":1,"k":[{"i":{"x":0.833,"y":0.833},"o":{"x":0.167,"y":0.167},"t":0,"s":[50,50,0],"to":[0,0,0],"ti":[0,0,0]},{"t":60,"s":[250,50,0]}],"ix":2},"a":{"a":0,"k":[0,0,0],"ix":1},"s":{"a":0,"k":[100,100,100],"ix":6}},"ao":0,"shapes":[{"ty":"rc","d":1,"s":{"a":0,"k":[50,50],"ix":2},"p":{"a":0,"k":[0,0],"ix":3},"r":{"a":0,"k":0,"ix":4},"nm":"Rectangle Path 1","mn":"ADBE Vector Shape - Rect","hd":false},{"ty":"fl","c":{"a":0,"k":[1,0,0,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false}],"ip":0,"op":60,"st":0,"bm":0}]}
```

**3. Create `examples/lottie-animation/src/main.ts`**:
```typescript
import { Helios } from '@helios-engine/core';
import lottie from 'lottie-web';
import animationData from './animation.json';

const helios = new Helios({
  duration: 2, // 60 frames @ 30fps = 2s
  fps: 30,
});

const container = document.getElementById('lottie-container');

if (container) {
    const anim = lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData: animationData as any, // Type cast if necessary
    });

    helios.subscribe(({ currentFrame, fps }) => {
      // Convert frame to milliseconds
      const timeMs = (currentFrame / fps) * 1000;
      // Seek Lottie (isFrame = false means time in ms)
      anim.goToAndStop(timeMs, false);
    });
}
```

**4. Modify `vite.build-example.config.js`**:
Add the following line to `rollupOptions.input` object:
```javascript
lottie_animation: resolve(__dirname, "examples/lottie-animation/composition.html"),
```

**5. Modify `tests/e2e/verify-render.ts`**:
Add the following object to the `CASES` array:
```typescript
{ name: 'Lottie', relativePath: 'examples/lottie-animation/composition.html', mode: 'dom' as const },
```

## 4. Test Plan
- **Verification**:
    1.  Run `npm run build:examples` to ensure it builds.
    2.  Run `npx ts-node tests/e2e/verify-render.ts` to verify the video is generated.
- **Success Criteria**:
    - `examples/lottie-animation` compiles without error.
    - `output/lottie-animation-render-verified.mp4` is generated.
    - The video shows the red square moving (based on JSON data).
- **Edge Cases**:
    - Ensure Lottie frame rate doesn't conflict (we use time-based seeking so it should be fine).
