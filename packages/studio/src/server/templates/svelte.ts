import { Template } from './types';

export const svelteTemplate: Template = {
  id: 'svelte',
  label: 'Svelte',
  generate: (name: string) => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <style>
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #111; }
    #app { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./main.ts"></script>
</body>
</html>`;

    const main = `import { mount } from 'svelte';
import App from './App.svelte';

const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;
`;

    const appSvelte = `<script lang="ts">
  import { Helios } from '@helios-project/core';
  import { createHeliosStore } from './lib/store';

  const duration = 5;
  const fps = 30;

  // Initialize Helios
  const helios = new Helios({
    duration,
    fps
  });

  helios.bindToDocumentTimeline();

  if (typeof window !== 'undefined') {
    (window as any).helios = helios;
  }

  const heliosStore = createHeliosStore(helios);
</script>

<div class="container">
    <div
        class="box"
        style:opacity={$heliosStore.currentFrame / (duration * fps)}
        style:transform={\`rotate(\${$heliosStore.currentFrame * 2}deg)\`}
    >
        Svelte DOM
    </div>
</div>

<style>
  :global(body) {
    margin: 0;
    overflow: hidden;
    background-color: #111;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100vh;
  }
  .box {
    width: 200px;
    height: 200px;
    background-color: royalblue;
    color: white;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 24px;
    font-family: sans-serif;
    border-radius: 10px;
  }
</style>
`;

    const store = `import { readable } from 'svelte/store';
import { Helios } from '@helios-project/core';

export const createHeliosStore = (helios: Helios) => {
  return readable(helios.getState(), (set) => {
    set(helios.getState());
    const unsubscribe = helios.subscribe((state) => {
      set(state);
    });
    return unsubscribe;
  });
};
`;

    return [
      { path: 'composition.html', content: html },
      { path: 'main.ts', content: main },
      { path: 'App.svelte', content: appSvelte },
      { path: 'lib/store.ts', content: store }
    ];
  }
};
