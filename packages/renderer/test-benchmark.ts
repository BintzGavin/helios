import { Renderer } from './src/Renderer.js';

async function runBenchmark() {
    const start = performance.now();

    const renderer = new Renderer({
        fps: 30,
        width: 600,
        height: 600,
        durationInSeconds: 5,
        mode: 'dom',
        intermediateImageFormat: 'jpeg',
        intermediateImageQuality: 90
    });

    try {
        await renderer.render(
            'http://localhost:3000/tests/fixtures/simple-animation.html',
            'output.mp4'
        );
        const elapsed = (performance.now() - start) / 1000;
        console.log(`\nrender_time_s: ${elapsed.toFixed(3)}`);
        console.log(`peak_mem_mb: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}`);
        console.log(`fps_effective: ${(150 / elapsed).toFixed(2)}`);
    } catch (e) {
        console.error('Benchmark failed:', e);
    }
}

runBenchmark();
