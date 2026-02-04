<script>
  import { onMount } from 'svelte';
  import { Helios } from '@helios-project/core';
  import { Application, Graphics } from 'pixi.js';

  let container;

  onMount(() => {
    // Initialize Helios
    const helios = new Helios({
      duration: 5,
      fps: 30,
    });
    helios.bindToDocumentTimeline();

    if (typeof window !== 'undefined') {
      window.helios = helios;
    }

    let app = null;
    let unsubscribe = null;
    let mounted = true;

    const init = async () => {
        const pixiApp = new Application();
        await pixiApp.init({
            resizeTo: window,
            backgroundColor: 0x111111,
            antialias: true
        });

        if (!mounted) {
            pixiApp.destroy({ removeView: true, children: true });
            return;
        }

        app = pixiApp;
        if (container) {
            container.appendChild(app.canvas);
        }

        // Create graphics
        const rect = new Graphics();
        rect.rect(-50, -50, 100, 100);
        rect.fill(0xff6600); // Svelte Orange
        rect.x = app.screen.width / 2;
        rect.y = app.screen.height / 2;
        app.stage.addChild(rect);

        // Subscribe to Helios
        unsubscribe = helios.subscribe((state) => {
            rect.rotation = state.currentTime * Math.PI;
            // Keep centered
            rect.x = app.screen.width / 2;
            rect.y = app.screen.height / 2;
        });
    };

    init();

    // Cleanup
    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
      if (app) {
          app.destroy({ removeView: true, children: true });
      }
    };
  });
</script>

<div bind:this={container} style="width: 100%; height: 100%;"></div>
