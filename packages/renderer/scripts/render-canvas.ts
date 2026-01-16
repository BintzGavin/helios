import { Renderer } from '../src/index';
import path from 'path';

async function main() {
  const width = 1920;
  const height = 1080;
  const fps = 30;
  const duration = 5;

  const renderer = new Renderer({
    width,
    height,
    fps,
    durationInSeconds: duration,
  });

  // Serve the example via a simple file server or just assume standard Vite dev server is running?
  // For robustness, let's assume we are pointing to the file directly or a running local server.
  // The simplest way for this script is to use a file:// URL or start a local server.
  // Playwright works fine with file:// but modules might have CORS issues if not careful.
  // Since we are using type="module" in the HTML, we need a server.

  // Actually, we can use the `npm run dev` output.
  // Let's assume the user has run `npm run dev` or we start a server.
  // But for this script, let's try to just use the `vite` dev server URL.

  const compositionUrl = 'http://localhost:5173/examples/canvas-basic/index.html';
  const outputPath = path.join(process.cwd(), 'output.mp4');

  console.log('Ensure "npm run dev" is running in another terminal!');
  console.log(`Rendering ${compositionUrl} to ${outputPath}`);

  try {
    await renderer.render(compositionUrl, outputPath);
    console.log('Success!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
