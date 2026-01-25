import { Helios } from '../../../packages/core/dist/index.js';
import { Application, Graphics } from 'pixi.js';

async function init() {
  // Initialize Pixi
  const app = new Application();
  await app.init({
    resizeTo: window,
    backgroundColor: 0x111111,
  });

  // Append canvas to DOM
  document.getElementById('app')!.appendChild(app.canvas);

  // Initialize Helios
  const helios = new Helios({
    fps: 30,
    duration: 5,
  });

  // Create a rotating rectangle
  const graphics = new Graphics();
  graphics.rect(0, 0, 100, 100).fill({ color: 0xff4444 });
  graphics.pivot.set(50, 50);
  graphics.position.set(app.screen.width / 2, app.screen.height / 2);

  app.stage.addChild(graphics);

  // Handle Resize
  window.addEventListener('resize', () => {
    graphics.position.set(app.screen.width / 2, app.screen.height / 2);
  });

  // Bind to document.timeline so the Renderer can drive us
  helios.bindToDocumentTimeline();

  // Sync with Helios
  helios.subscribe((state) => {
    const time = state.currentFrame / helios.config.fps;
    graphics.rotation = time * Math.PI; // Rotate 180 degrees per second
  });

  // Expose helios for the Renderer/Bridge
  (window as any).helios = helios;
}

init();
