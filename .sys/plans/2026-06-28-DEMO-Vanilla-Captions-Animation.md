# Plan: Vanilla JS Captions Animation Example

## 1. Context & Goal
- **Objective**: Create a new example `examples/vanilla-captions-animation` that demonstrates how to use Helios captions (SRT) with plain Vanilla JavaScript/TypeScript.
- **Trigger**: Parity Gap - Captions are demonstrated in React, Vue, and Svelte (and planned for Solid), but missing in the base Vanilla JS implementation.
- **Impact**: Provides a canonical reference for the core `activeCaptions` API without framework abstractions, useful for users of unsupported frameworks or those requiring maximum performance/minimal overhead.

## 2. File Inventory
- **Create**:
  - `examples/vanilla-captions-animation/composition.html`: Entry point.
  - `examples/vanilla-captions-animation/src/main.ts`: Main logic using Helios core API.
  - `examples/vanilla-captions-animation/tsconfig.json`: TypeScript configuration for editor support.
- **Modify**:
  - None (Root `vite.build-example.config.js` automatically discovers composition.html files).

## 3. Implementation Spec

### Architecture
- **Framework**: Vanilla TypeScript (no UI framework).
- **Pattern**:
  - Direct instantiation of `Helios` class.
  - Direct DOM manipulation in `helios.subscribe()` callback.
  - Use of `helios.activeCaptions` signal (accessed via state).

### Pseudo-Code

#### `src/main.ts`
```typescript
import { Helios } from '@helios-project/core';

// 1. Define SRT content
const sampleSrt = `
1
00:00:00,000 --> 00:00:02,000
Hello, World!

2
00:00:02,000 --> 00:00:04,000
This is Vanilla JS.
`;

// 2. Initialize Helios
const helios = new Helios({
  fps: 30,
  duration: 5,
  captions: sampleSrt,
  autoSyncAnimations: true
});

// 3. Setup DOM elements
const app = document.getElementById('app')!;
const captionContainer = document.createElement('div');
captionContainer.style.position = 'absolute';
captionContainer.style.bottom = '50px';
captionContainer.style.width = '100%';
captionContainer.style.textAlign = 'center';
captionContainer.style.pointerEvents = 'none';
app.appendChild(captionContainer);

// 4. Subscribe and Render
helios.subscribe((state) => {
  // Clear previous
  captionContainer.innerHTML = '';

  // Render active cues
  const active = state.activeCaptions;
  active.forEach(cue => {
    const div = document.createElement('div');
    div.textContent = cue.text;
    div.style.display = 'inline-block';
    div.style.backgroundColor = 'rgba(0,0,0,0.7)';
    div.style.color = 'white';
    div.style.padding = '10px 20px';
    div.style.borderRadius = '8px';
    div.style.fontSize = '24px';
    div.style.fontFamily = 'Arial, sans-serif';
    div.style.margin = '0 10px';

    captionContainer.appendChild(div);
  });
});

// 5. Bind for preview
helios.bindToDocumentTimeline();

// Expose for debug
(window as any).helios = helios;
```

#### `composition.html`
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vanilla Captions</title>
  <style>
    body { margin: 0; overflow: hidden; background-color: #222; }
    #app { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; color: #555; font-family: sans-serif; font-size: 40px; }
  </style>
</head>
<body>
  <div id="app">Background Content</div>
  <script type="module" src="./src/main.ts"></script>
</body>
</html>
```

## 4. Test Plan
- **Verification**: Run `npm run build:examples`.
- **Success Criteria**:
  - Build completes successfully.
  - `output/example-build/examples/vanilla-captions-animation/composition.html` exists.
- **Edge Cases**:
  - Ensure styles are applied correctly so captions are visible (white text on dark background).
