# Plan: Scaffold Captions Animation Example

## 1. Context & Goal
- **Objective**: Create a new example `examples/captions-animation` to demonstrate the built-in SRT captioning capabilities of the Helios Core.
- **Trigger**: "Captions/subtitles" are listed as "Not yet" in README but fully implemented in Core (`packages/core/src/captions.ts`). We need to demonstrate this feature.
- **Impact**: Unlocks the ability for users to add burned-in subtitles to their videos using standard SRT strings.

## 2. File Inventory
- **Create**:
    - `examples/captions-animation/composition.html`
    - `examples/captions-animation/index.html`
    - `examples/captions-animation/README.md`
- **Modify**:
    - `vite.build-example.config.js`: Add entry point.
    - `tests/e2e/verify-render.ts`: Add verification test case.
- **Read-Only**:
    - `packages/core/dist/index.js`

## 3. Implementation Spec

### 3.1. `examples/captions-animation/composition.html`
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Captions Animation</title>
  <style>
    body {
      margin: 0;
      overflow: hidden;
      background-color: #111;
      font-family: sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      color: white;
    }
    .background {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(45deg, #ff0055, #0055ff);
      opacity: 0.3;
      z-index: 0;
      animation: shift 10s infinite alternate;
    }
    @keyframes shift {
      from { filter: hue-rotate(0deg); }
      to { filter: hue-rotate(360deg); }
    }
    .content {
      z-index: 1;
      text-align: center;
    }
    h1 {
      font-size: 3rem;
      margin-bottom: 2rem;
    }
    .caption-box {
      font-size: 2rem;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
      background: rgba(0,0,0,0.5);
      padding: 10px 20px;
      border-radius: 8px;
      min-height: 2.4rem;
      transition: opacity 0.2s;
    }
    .caption-box:empty {
      opacity: 0;
    }
  </style>
</head>
<body>
  <div class="background"></div>
  <div class="content">
    <h1>Helios Captions</h1>
    <div class="caption-box" id="captions"></div>
  </div>

  <script type="module">
    import { Helios } from '../../packages/core/dist/index.js';

    const srt = `1
00:00:00,500 --> 00:00:02,500
Welcome to Helios.

2
00:00:02,800 --> 00:00:04,800
This text is driven by an SRT string.

3
00:00:05,000 --> 00:00:07,000
It works seamlessly with your animation.

4
00:00:07,500 --> 00:00:09,500
Burned directly into the video.`;

    const helios = new Helios({
      duration: 10,
      fps: 30,
      captions: srt,
      autoSyncAnimations: true
    });

    const captionBox = document.getElementById('captions');

    helios.subscribe((state) => {
      // Update Captions
      if (state.activeCaptions.length > 0) {
        // Join multiple cues with newlines if necessary
        captionBox.innerText = state.activeCaptions.map(c => c.text).join('\n');
        captionBox.style.opacity = 1;
      } else {
        captionBox.innerText = '';
        captionBox.style.opacity = 0;
      }
    });

    window.helios = helios;
    helios.bindToDocumentTimeline();
  </script>
</body>
</html>
```

### 3.2. `examples/captions-animation/index.html`
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Captions Example Preview</title>
  <style>
    body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #222; }
  </style>
</head>
<body>
  <helios-player src="./composition.html" width="1280" height="720" controls></helios-player>
  <script type="module" src="../../packages/player/dist/index.js"></script>
</body>
</html>
```

### 3.3. `examples/captions-animation/README.md`
```markdown
# Captions Animation Example

This example demonstrates how to use the built-in SRT caption support in Helios.

## Features
- Passing an SRT string to the `Helios` constructor.
- Subscribing to `state.activeCaptions`.
- Rendering "burned-in" subtitles into the DOM.

## Usage
Run `npm run dev` in the root and navigate to this directory.
```

### 3.4. Modify `vite.build-example.config.js`
In `rollupOptions.input`:
```javascript
<<<<<<< SEARCH
        motion_one: resolve(__dirname, "examples/motion-one-animation/composition.html"),
      },
    },
=======
        motion_one: resolve(__dirname, "examples/motion-one-animation/composition.html"),
        captions_animation: resolve(__dirname, "examples/captions-animation/composition.html"),
      },
    },
>>>>>>> REPLACE
```

### 3.5. Modify `tests/e2e/verify-render.ts`
Inside `main()` function:
```typescript
<<<<<<< SEARCH
  await verifyExample("examples/motion-one-animation/composition.html", "motion-one.mp4");
=======
  await verifyExample("examples/motion-one-animation/composition.html", "motion-one.mp4");
  await verifyExample("examples/captions-animation/composition.html", "captions-animation.mp4");
>>>>>>> REPLACE
```

## 4. Test Plan
- **Verification**:
    1. Run `npm run build:examples`.
    2. Run `npx ts-node tests/e2e/verify-render.ts`.
- **Success Criteria**:
    - Build succeeds.
    - `output/captions-animation.mp4` is created.
