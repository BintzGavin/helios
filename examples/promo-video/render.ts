/**
 * Helios Promo Video Render Script
 * 
 * Run with: npx ts-node render.ts
 * 
 * Make sure the dev server is running first:
 * npm run dev:promo (from the project root)
 */

import { Renderer } from '../../packages/renderer/src/index.ts';
import path from 'path';
import fs from 'fs';

async function main() {
  const compositionUrl = 'http://localhost:3001/composition.html';
  const outputPath = path.resolve(__dirname, 'output/helios-promo.mp4');

  // Ensure output directory exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  console.log('🎬 Starting Helios Promo Video Render...');
  console.log(`   Source: ${compositionUrl}`);
  console.log(`   Output: ${outputPath}`);
  console.log('');

  const renderer = new Renderer({
    width: 1920,
    height: 1080,
    fps: 30,
    durationInSeconds: 15,
    mode: 'dom', // Use DOM mode for CSS animations

    // High quality encoding
    videoCodec: 'libx264',
    crf: 18,
    preset: 'slow',
    pixelFormat: 'yuv420p',
  });

  try {
    await renderer.render(compositionUrl, outputPath, {
      onProgress: (progress) => {
        const percent = Math.round(progress * 100);
        const bar = '█'.repeat(Math.floor(percent / 2)) + '░'.repeat(50 - Math.floor(percent / 2));
        process.stdout.write(`\r   [${bar}] ${percent}%`);
      }
    });

    console.log('\n');
    console.log('✅ Render complete!');
    console.log(`   Output saved to: ${outputPath}`);
    console.log('');
  } catch (err) {
    console.error('\n❌ Render failed:', err);
    process.exit(1);
  }
}

main();
