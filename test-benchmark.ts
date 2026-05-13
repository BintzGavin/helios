import { Renderer } from './packages/renderer/src/index.ts';

async function run() {
    const start = performance.now();
    const renderer = new Renderer({ mode: 'dom', width: 1280, height: 720, fps: 30, durationInSeconds: 10 });
    await renderer.render('file://' + process.cwd() + '/output/example-build/examples/dom-benchmark/composition.html', 'output.mp4');
    const elapsed = (performance.now() - start) / 1000;

    console.log('---');
    console.log(`render_time_s:      ${elapsed.toFixed(3)}`);
    console.log(`total_frames:       ${300}`);
    console.log(`fps_effective:      ${(300 / elapsed).toFixed(2)}`);
    console.log(`peak_mem_mb:        ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}`);
}

run().catch(console.error);
