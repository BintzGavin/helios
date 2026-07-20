const { Renderer } = require('./packages/renderer/dist/Renderer.js');
async function run() {
  const r = new Renderer({ mode: 'canvas', headless: true, width: 1280, height: 720, fps: 30, durationInSeconds: 1 });
  await r.render('about:blank', 'test_canvas.mp4');
  console.log("Canvas test passed.");
}
run();
