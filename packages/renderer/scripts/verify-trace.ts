import { Renderer } from '../src/index';
import * as path from 'path';
import * as fs from 'fs';

(async () => {
  try {
    const tracePath = path.resolve(__dirname, '../../../output/trace.zip');
    // Ensure output directory exists
    const outputDir = path.dirname(tracePath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Clean up previous trace if any
    if (fs.existsSync(tracePath)) {
      fs.unlinkSync(tracePath);
    }

    const renderer = new Renderer({
      width: 100, height: 100, fps: 30, durationInSeconds: 1,
      mode: 'canvas'
    });

    // Use a simple built example - assuming simple-canvas-animation is built
    const compositionUrl = 'file://' + path.resolve(__dirname, '../../../output/example-build/examples/simple-canvas-animation/composition.html');

    console.log('Rendering with trace...');
    console.log('Trace path:', tracePath);

    const outputPath = path.resolve(__dirname, '../../../output/trace-test.mp4');

    await renderer.render(
      compositionUrl,
      outputPath,
      { tracePath }
    );

    if (fs.existsSync(tracePath)) {
      console.log('✅ Trace file created at:', tracePath);
      process.exit(0);
    } else {
      console.error('❌ Trace file missing!');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Error during verification:', err);
    process.exit(1);
  }
})();
