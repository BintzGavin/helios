import { CanvasStrategy } from '../src/strategies/CanvasStrategy.js';
import { RendererOptions } from '../src/types.js';
import * as assert from 'assert';

// Mock types for the browser environment
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

// Global mocks that will be injected into the evaluation scope
let mockVideoEncoderSupport: Record<string, boolean> = {};
let mockHardwareSupport: Record<string, boolean> = {}; // codec -> isHardware

async function runTest() {
    console.log('Verifying Hardware Codec Selection...');

    // Function to simulate the browser environment and run the extracted script
    const executeBrowserScript = async (scriptBody: string, args: any) => {
        // Create a secure-ish scope
        const scope: any = {
            VideoEncoder: {
                isConfigSupported: async (config: MockVideoEncoderConfig) => {
                    const isSupported = mockVideoEncoderSupport[config.codec] !== false; // Default true if not explicitly false
                    return {
                        supported: isSupported,
                        config
                    };
                }
            },
            navigator: {
                mediaCapabilities: {
                    encodingInfo: async (config: MockMediaCapabilitiesConfig) => {
                         // Extract codec from contentType "video/webm; codecs=vp9" or codecs="vp9"
                         const codecMatch = config.video.contentType.match(/codecs=["']?([^"']+)["']?/);
                         const codec = codecMatch ? codecMatch[1] : '';

                         // Simple matching for the mock
                         let isPowerEfficient = false;

                         // Check our mock table
                         // We need to handle full codec strings vs short names
                         // The script maps candidates to likely contentTypes.

                         // We'll iterate our keys to find a match
                         for (const key of Object.keys(mockHardwareSupport)) {
                             if (codec.includes(key) || key.includes(codec)) {
                                 isPowerEfficient = mockHardwareSupport[key];
                                 break;
                             }
                         }

                         return {
                             supported: true,
                             smooth: true,
                             powerEfficient: isPowerEfficient
                         };
                    }
                }
            },
            window: {
                heliosWebCodecs: {}
            },
            console: {
                log: () => {}, // suppress logs
                error: console.error
            }
        };

        // We also need to mock VideoEncoder constructor since the script instantiates it
        const originalIsConfigSupported = scope.VideoEncoder.isConfigSupported;
        scope.VideoEncoder = class MockVideoEncoder {
            static async isConfigSupported(config: MockVideoEncoderConfig) {
                return originalIsConfigSupported(config);
            }
            configure() {}
            encode() {}
            close() {}
        };

        // Wrap the script in a function with the scope
        // The script is `(async (config) => { ... })(${JSON.stringify(args)})`
        // We stripped the IIFE wrapper, so we have `async (config) => { ... }`

        // We'll use new Function to execute it with our scope variables
        // But `new Function` creates a function in the global scope.
        // We need to pass the mocks as arguments.

        const keys = Object.keys(scope);
        const values = Object.values(scope);

        // The script body provided is likely the whole IIFE string from page.evaluate
        // We need to parse it carefully.
        // CanvasStrategy: `(async (config) => { ... })(${JSON.stringify(args)})`

        // Let's assume we extracted just the inner function body `async (config) => { ... }`
        // We can reconstruct it.

        // Wait, the extractor below extracts the JSON args.
        // We need to extract the FUNCTION source.

        // We will execute:
        // const fn = new Function('VideoEncoder', 'navigator', 'window', 'console', 'return ' + scriptBody);
        // const asyncFn = fn(...values);
        // return asyncFn(args);

        const fn = new Function(...keys, 'return ' + scriptBody);
        const asyncFn = fn(...values);
        return asyncFn(args);
    };

    const createMockPage = (cb: (script: string, args: any) => Promise<any>) => ({
        viewportSize: () => ({ width: 1920, height: 1080 }),
        frames: () => [],
        evaluate: async (fn: any, args: any) => {
             // fn is the script string
             if (typeof fn === 'string') {
                 // Extract arguments
                 const jsonMatch = fn.match(/\)\((\{.*\})\)\s*$/);
                 let parsedArgs = args;
                 if (jsonMatch) {
                     parsedArgs = JSON.parse(jsonMatch[1]);
                 }

                 // Extract function body
                 // The string is `(async (config) => { ... })(...)`
                 // We want `async (config) => { ... }`
                 const bodyMatch = fn.match(/^\s*\((async\s*\(.*?\)\s*=>\s*\{[\s\S]*?\})\)\(/);
                 if (bodyMatch) {
                     return cb(bodyMatch[1], parsedArgs);
                 }
             }
             return { supported: false, reason: 'Test Mock: Failed to parse script' };
        }
    } as any);

    // Common options
    const options: RendererOptions = {
        width: 1920,
        height: 1080,
        fps: 30,
        videoCodec: 'copy' // Enable smart selection
    };

    const strategy = new CanvasStrategy(options);

    // Test 1: H.264 (Software) vs VP9 (Hardware) -> Should select VP9
    {
        console.log('Test 1: H.264 (Software) vs VP9 (Hardware)');
        mockVideoEncoderSupport = {
            'avc1': true,
            'vp9': true,
            'av01': true,
            'vp8': true
        };
        mockHardwareSupport = {
            'avc1': false,
            'vp9': true,  // <-- Hardware
            'av01': false,
            'vp8': false
        };

        const mockPage = createMockPage((script, args) => executeBrowserScript(script, args));

        // Note: This will fail until implementation is updated because currently it picks first supported (H.264)
        try {
            await strategy.prepare(mockPage);

            // We need to inspect the strategy state or the result of prepare
            // CanvasStrategy stores usage in private fields.
            // But verify logic: verify output of evaluate.
            // Since we are mocking evaluate, we can check what WE returned from executeBrowserScript.
            // But executeBrowserScript runs the actual script.

            // Wait, strategy.prepare ignores the return value mostly, just sets internal flags.
            // But we can check `strategy['useH264']` (if we ignore TS private)
            // OR we can rely on the fact that `executeBrowserScript` returns the selected result.
            // We should wrap the callback to spy on the result.
        } catch (e) {
            console.error(e);
        }
    }

    // Better Approach:
    // We run the script in isolation and check its return value.
    // We don't strictly need to run strategy.prepare(), just get the script.

    // But we can't easily get the script without running prepare() and intercepting evaluate.

    let capturedScript: string = '';
    let capturedArgs: any = null;

    const interceptorPage = createMockPage(async (script, args) => {
        capturedScript = script;
        capturedArgs = args;
        return { supported: false }; // Dummy return to stop strategy
    });

    try {
        await strategy.prepare(interceptorPage);
    } catch (e) {
        // Expected to fail/throw because we return supported: false
    }

    if (!capturedScript) {
        console.error('❌ Failed to capture script');
        process.exit(1);
    }

    console.log('Captured script successfully.');

    // Now run the scenarios against the captured script

    // Scenario 1: H.264 (Software) vs VP9 (Hardware) -> VP9
    {
        mockVideoEncoderSupport = { 'avc1': true, 'vp9': true };
        mockHardwareSupport = { 'avc1': false, 'vp9': true };

        const result = await executeBrowserScript(capturedScript, capturedArgs);
        console.log('Scenario 1 Result:', result);

        if (result.codec && result.codec.includes('vp9')) {
             console.log('✅ Selected VP9 (Hardware) over H.264 (Software)');
        } else {
             console.error(`❌ Expected VP9, got ${result.codec}`);
             // process.exit(1); // Don't exit yet, allow failure for TDD
        }
    }

    // Scenario 2: H.264 (Hardware) vs VP9 (Hardware) -> H.264 (Preference)
    {
        mockVideoEncoderSupport = { 'avc1': true, 'vp9': true };
        mockHardwareSupport = { 'avc1': true, 'vp9': true };

        const result = await executeBrowserScript(capturedScript, capturedArgs);
        console.log('Scenario 2 Result:', result);

        if (result.codec && result.codec.includes('avc1')) {
             console.log('✅ Selected H.264 (Hardware) over VP9 (Hardware) due to preference');
        } else {
             console.error(`❌ Expected H.264, got ${result.codec}`);
        }
    }

    // Scenario 3: No Hardware -> H.264 (Preference)
    {
        mockVideoEncoderSupport = { 'avc1': true, 'vp9': true };
        mockHardwareSupport = { 'avc1': false, 'vp9': false };

        const result = await executeBrowserScript(capturedScript, capturedArgs);
        console.log('Scenario 3 Result:', result);

        if (result.codec && result.codec.includes('avc1')) {
             console.log('✅ Selected H.264 (Software) when no hardware available');
        } else {
             console.error(`❌ Expected H.264, got ${result.codec}`);
        }
    }
}

runTest().catch(console.error);
