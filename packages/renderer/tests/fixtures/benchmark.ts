import { Renderer } from '../../src/Renderer.js';
import path from 'path';

async function runBenchmark() {
    const start = process.hrtime.bigint();
    const renderer = new Renderer({
        width: 1280,
        height: 720,
        fps: 30,
        durationInSeconds: 5, // 150 frames
        mode: 'dom',
        targetSelector: 'body'
    });

    const compositionUrl = 'file:///app/examples/simple-animation/composition.html';
    const outputPath = path.resolve(process.cwd(), 'dom-animation.mp4');

    await renderer.render(compositionUrl, outputPath);

    const end = process.hrtime.bigint();
    const elapsed = Number(end - start) / 1e9;
    const totalFrames = 150;

    console.log('---');
    console.log(`render_time_s:      ${elapsed.toFixed(3)}`);
    console.log(`total_frames:       ${totalFrames}`);
    console.log(`fps_effective:      ${(totalFrames / elapsed).toFixed(2)}`);
    console.log(`peak_mem_mb:        ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}`);
}

runBenchmark().catch(console.error);
