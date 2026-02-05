import { CanvasStrategy } from '../src/strategies/CanvasStrategy.js';
import { RendererOptions } from '../src/types.js';
import * as assert from 'assert';

// Mock types
interface MockVideoEncoderConfig {
    codec: string;
    width: number;
    height: number;
    bitrate?: number;
    avc?: { format: string };
    alpha?: string;
}

interface MockMediaCapabilitiesConfig {
    type: 'webrtc' | 'record';
    video: {
        contentType: string;
        width: number;
        height: number;
        bitrate: number;
        framerate: number;
    };
}

async function runTest() {
    console.log('Verifying Diagnose Syntax...');

    const createMockPage = (cb: (script: Function) => Promise<any>) => ({
        evaluate: async (fn: any, args: any) => {
             // fn is the function
             if (typeof fn === 'function') {
                 return cb(fn);
             }
             return {};
        }
    } as any);

    const options: RendererOptions = {
        width: 1920,
        height: 1080,
        fps: 30,
        mode: 'canvas'
    };

    const strategy = new CanvasStrategy(options);

    let capturedFunction: Function | null = null;
    const mockPage = createMockPage(async (fn) => {
        capturedFunction = fn;
        // We can try to execute it in a sandbox if we mock everything
        return {};
    });

    await strategy.diagnose(mockPage);

    if (!capturedFunction) {
        console.error('❌ Failed to capture diagnose function');
        process.exit(1);
    }

    console.log('Captured diagnose function successfully.');

    // Convert function to string and check for syntax issues (basic check)
    const fnString = capturedFunction.toString();
    console.log('Function body length:', fnString.length);

    // Check if it contains the expected logic
    if (!fnString.includes('navigator.mediaCapabilities.encodingInfo')) {
        console.error('❌ Diagnose function missing mediaCapabilities check');
        process.exit(1);
    }

    // Execute it in a sandbox to verify syntax
    const executeBrowserScript = async (fn: Function) => {
        const scope: any = {
            VideoEncoder: {
                isConfigSupported: async () => ({ supported: true, type: 'hardware' })
            },
            navigator: {
                userAgent: 'MockAgent',
                mediaCapabilities: {
                    encodingInfo: async (config: MockMediaCapabilitiesConfig) => {
                         console.log('Called encodingInfo with:', config.video.contentType);
                         return { powerEfficient: true };
                    }
                }
            },
            OffscreenCanvas: {},
            console: { log: () => {} }
        };

        // Mock VideoEncoder global
        scope.VideoEncoder.isConfigSupported = scope.VideoEncoder.isConfigSupported;

        // Execute the function string in a new Function with mocked globals
        // Since the function is `async function() { ... }`
        // We strip `async function() {` and `}`

        let body = fnString.substring(fnString.indexOf('{') + 1, fnString.lastIndexOf('}'));

        // Create function with scope arguments
        const keys = Object.keys(scope);
        const values = Object.values(scope);

        const safeFn = new Function(...keys, 'return (async () => {' + body + '})()');
        return safeFn(...values);
    };

    try {
        const result = await executeBrowserScript(capturedFunction);
        console.log('Diagnose Result:', JSON.stringify(result, null, 2));

        if (result.codecs && result.codecs.h264 && result.codecs.h264.hardware) {
            console.log('✅ Diagnose executed successfully and detected hardware support');
        } else {
            console.error('❌ Diagnose result unexpected');
            process.exit(1);
        }

    } catch (e) {
        console.error('❌ Diagnose execution failed (Syntax Error?):', e);
        process.exit(1);
    }
}

runTest().catch(console.error);
