import { Template, CompositionOptions } from './types';

export const solidTemplate: Template = {
  id: 'solid',
  label: 'Solid',
  generate: (name: string, options: CompositionOptions) => {
    const { fps, duration } = options;
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <style>
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #000; }
    #app { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>`;

    const main = `import { render } from 'solid-js/web';
import App from './App';
import { Helios } from '@helios-project/core';

const duration = ${duration};
const fps = ${fps};

// Initialize Helios
const helios = new Helios({
  duration,
  fps,
  autoSyncAnimations: true
});

helios.bindToDocumentTimeline();

// Expose to window for debugging/player control
if (typeof window !== 'undefined') {
  (window as any).helios = helios;
}

render(() => <App />, document.getElementById('app')!);
`;

    const app = `import { createMemo } from 'solid-js';
import { createHeliosSignal } from './lib/createHeliosSignal';
import './style.css';

function App() {
  const helios = (window as any).helios;
  const state = createHeliosSignal(helios);

  const duration = helios.duration;
  const fps = helios.fps;

  // Derived state for rotation (0 to 360 deg)
  const rotation = createMemo(() => {
    const s = state();
    const totalFrames = duration * fps;
    const progress = totalFrames > 0 ? s.currentFrame / totalFrames : 0;
    return progress * 360;
  });

  return (
    <div class="container">
      <div
        class="box"
        style={{ transform: \`rotate(\${rotation()}deg)\` }}
      >
        Solid DOM
      </div>
    </div>
  );
}

export default App;
`;

    const css = `body {
  margin: 0;
  background-color: #000;
}
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  color: white;
  font-family: sans-serif;
}
.box {
  width: 200px;
  height: 200px;
  background-color: #446b9e;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 24px;
  font-weight: bold;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
}`;

    const createHeliosSignal = `import { createSignal, onCleanup, onMount } from 'solid-js';
import { Helios, HeliosState } from '@helios-project/core';

export function createHeliosSignal(helios: Helios) {
  const [state, setState] = createSignal<HeliosState>(helios.getState());

  onMount(() => {
    const unsub = helios.subscribe(setState);
    onCleanup(() => {
      unsub();
    });
  });

  return state;
}
`;

    return [
      { path: 'composition.html', content: html },
      { path: 'main.tsx', content: main },
      { path: 'App.tsx', content: app },
      { path: 'style.css', content: css },
      { path: 'lib/createHeliosSignal.ts', content: createHeliosSignal }
    ];
  }
};
