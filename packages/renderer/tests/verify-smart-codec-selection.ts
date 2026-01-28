import { CanvasStrategy } from '../src/strategies/CanvasStrategy.js';
import { RendererOptions } from '../src/types.js';
import * as assert from 'assert';

async function runTest() {
    console.log('Verifying Smart Codec Selection...');

    // Test 1: Copy Mode -> Candidates should include H.264
    {
        console.log('Test 1: Copy Mode');
        const options: RendererOptions = {
            width: 1920,
            height: 1080,
            fps: 30,
            durationInSeconds: 1,
            videoCodec: 'copy'
        };
        const strategy = new CanvasStrategy(options);
        let capturedArgs: any = null;

        const mockPage = {
            viewportSize: () => ({ width: 1920, height: 1080 }),
            evaluate: async (fn: any, args: any) => {
                if (args && args.candidates) {
                    capturedArgs = args;
                    // Simulate H264 supported
                    return { supported: true, codec: 'avc1.4d002a', isH264: true };
                }
                return true;
            }
        } as any;

        await strategy.prepare(mockPage);

        assert.ok(capturedArgs, 'Should call evaluate with args');
        assert.ok(capturedArgs.candidates, 'Should have candidates array');
        const codecs = capturedArgs.candidates.map((c: any) => c.codecString);

        console.log('Candidates:', codecs);

        assert.ok(codecs.includes('avc1.4d002a'), 'Candidates should include H.264');
        assert.strictEqual(codecs[0], 'avc1.4d002a', 'H.264 should be first candidate');

        // Check internal state (accessing private property via any or inference)
        // logic: if prepare returns successfully and mock returned isH264=true,
        // then getFFmpegArgs should return -f h264
        const ffmpegArgs = strategy.getFFmpegArgs(options, 'out.mp4');
        assert.ok(ffmpegArgs.includes('-f'), 'Should have format flag');
        const fIndex = ffmpegArgs.indexOf('-f');
        assert.strictEqual(ffmpegArgs[fIndex + 1], 'h264', 'Should use h264 format');

        console.log('✅ Copy mode checks passed');
    }

     // Test 2: Default Mode -> Candidates should be VP8
    {
        console.log('Test 2: Default Mode');
        const options: RendererOptions = {
            width: 1920,
            height: 1080,
            fps: 30,
            durationInSeconds: 1,
            // no videoCodec specified
        };
        const strategy = new CanvasStrategy(options);
        let capturedArgs: any = null;

        const mockPage = {
            viewportSize: () => ({ width: 1920, height: 1080 }),
            evaluate: async (fn: any, args: any) => {
                 if (args && args.candidates) {
                    capturedArgs = args;
                    return { supported: true, codec: 'vp8', isH264: false };
                }
                return true;
            }
        } as any;

        await strategy.prepare(mockPage);

        assert.ok(capturedArgs, 'Should call evaluate with args');
        const codecs = capturedArgs.candidates.map((c: any) => c.codecString);

        console.log('Candidates:', codecs);

        assert.strictEqual(codecs[0], 'vp8', 'VP8 should be first candidate');

        const ffmpegArgs = strategy.getFFmpegArgs(options, 'out.mp4');
        const fIndex = ffmpegArgs.indexOf('-f');
        assert.strictEqual(ffmpegArgs[fIndex + 1], 'ivf', 'Should use ivf format');

        console.log('✅ Default mode checks passed');
    }

    // Test 3: Explicit Override -> Should respect intermediateVideoCodec
    {
        console.log('Test 3: Explicit Override');
        const options: RendererOptions = {
            width: 1920,
            height: 1080,
            fps: 30,
            durationInSeconds: 1,
            videoCodec: 'copy', // This should be ignored for intermediate selection if override is present
            intermediateVideoCodec: 'vp9'
        };
        const strategy = new CanvasStrategy(options);
        let capturedArgs: any = null;

        const mockPage = {
            viewportSize: () => ({ width: 1920, height: 1080 }),
            evaluate: async (fn: any, args: any) => {
                 if (args && args.candidates) {
                    capturedArgs = args;
                    return { supported: true, codec: 'vp9', isH264: false };
                }
                return true;
            }
        } as any;

        await strategy.prepare(mockPage);

        assert.ok(capturedArgs);
        const codecs = capturedArgs.candidates.map((c: any) => c.codecString);

        console.log('Candidates:', codecs);

        assert.strictEqual(codecs[0], 'vp9', 'Should prioritize explicit intermediate codec');

        console.log('✅ Explicit override checks passed');
    }
}

runTest().catch(err => {
    console.error(err);
    process.exit(1);
});
