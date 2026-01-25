import { Renderer } from '../src/index';
import { RendererOptions } from '../src/types';
import path from 'path';
import fs from 'fs';

async function verifyErrorHandling() {
  const outputPath = path.join(__dirname, 'error-test.mp4');
  const options: RendererOptions = {
    width: 1280,
    height: 720,
    fps: 30,
    durationInSeconds: 1, // Short duration
    mode: 'canvas', // Use canvas mode to test general page error handling
  };

  const renderer = new Renderer(options);

  // A page that throws an error immediately
  const compositionUrl = 'data:text/html,<html><body><canvas width="1280" height="720"></canvas><script>setTimeout(() => { throw new Error("Intentional Page Error"); }, 50);</script></body></html>';

  console.log('Starting render with intentional error...');

  try {
    await renderer.render(compositionUrl, outputPath);
    console.error('FAILED: Render should have thrown an error but completed successfully.');
    process.exit(1);
  } catch (err: any) {
    console.log('Caught expected error:', err.message);
    if (err.message.includes('Intentional Page Error')) {
        console.log('PASSED: Correct error propagated.');
    } else {
        console.log('WARNING: Error message did not match expected text, but an error was caught.');
        console.log('Actual error:', err);
    }

    // Cleanup
    if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
    }
  }
}

verifyErrorHandling().catch(err => {
  console.error('Unhandled script error:', err);
  process.exit(1);
});
