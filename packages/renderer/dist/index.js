import { spawn } from 'child_process';
import { chromium } from 'playwright';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
export class Renderer {
    options;
    constructor(options) {
        this.options = options;
    }
    async render(compositionUrl, outputPath) {
        console.log(`Starting render for composition: ${compositionUrl}`);
        const browser = await chromium.launch({
            headless: true,
            args: [
                '--use-gl=egl',
                '--ignore-gpu-blocklist',
                '--enable-gpu-rasterization',
                '--enable-zero-copy',
            ],
        });
        try {
            const page = await browser.newPage({
                viewport: {
                    width: this.options.width,
                    height: this.options.height,
                },
            });
            console.log(`Navigating to ${compositionUrl}...`);
            await page.goto(compositionUrl, { waitUntil: 'networkidle' });
            console.log('Page loaded.');
            const ffmpegPath = ffmpeg.path;
            const totalFrames = this.options.durationInSeconds * this.options.fps;
            const fps = this.options.fps;
            const args = [
                '-y',
                '-f', 'image2pipe',
                '-framerate', `${fps}`,
                '-i', '-',
                '-c:v', 'libx264',
                '-pix_fmt', 'yuv420p',
                '-movflags', '+faststart',
                outputPath,
            ];
            const ffmpegProcess = spawn(ffmpegPath, args);
            console.log(`Spawning FFmpeg: ${ffmpegPath} ${args.join(' ')}`);
            ffmpegProcess.stderr.on('data', (data) => {
                console.error(`ffmpeg: ${data.toString()}`);
            });
            const ffmpegExitPromise = new Promise((resolve, reject) => {
                ffmpegProcess.on('close', (code) => {
                    if (code === 0) {
                        resolve();
                    }
                    else {
                        reject(new Error(`FFmpeg process exited with code ${code}`));
                    }
                });
                ffmpegProcess.on('error', (err) => {
                    reject(err);
                });
            });
            console.log(`Starting capture for ${totalFrames} frames...`);
            const progressInterval = Math.floor(totalFrames / 10);
            for (let i = 0; i < totalFrames; i++) {
                const time = (i / fps) * 1000;
                if (i > 0 && i % progressInterval === 0) {
                    console.log(`Progress: Rendered ${i} / ${totalFrames} frames`);
                }
                const dataUrl = await page.evaluate((timeValue) => {
                    document.timeline.currentTime = timeValue;
                    return new Promise((resolve) => {
                        requestAnimationFrame(() => {
                            const canvas = document.querySelector('canvas');
                            if (!canvas)
                                return resolve('error:canvas-not-found');
                            resolve(canvas.toDataURL('image/png'));
                        });
                    });
                }, time);
                if (typeof dataUrl !== 'string' || dataUrl === 'error:canvas-not-found') {
                    throw new Error('Could not find canvas element or an error occurred during capture.');
                }
                const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');
                await new Promise((resolve, reject) => {
                    ffmpegProcess.stdin.write(buffer, (err) => err ? reject(err) : resolve());
                });
            }
            console.log('Finished sending frames. Closing FFmpeg stdin.');
            ffmpegProcess.stdin.end();
            await ffmpegExitPromise;
            console.log('FFmpeg has finished processing.');
        }
        finally {
            await browser.close();
            console.log('Browser closed.');
        }
        console.log(`Render complete! Output saved to: ${outputPath}`);
    }
}
