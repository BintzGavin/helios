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
    console.log('Verifying WebCodecs Preference...');

    // Function to simulate the browser environment and run the extracted script
    const executeBrowserScript = async (scriptBody: string, args: any) => {
        const scope: any = {
            VideoEncoder: {
                isConfigSupported: async (config: MockVideoEncoderConfig) => {
                    const isSupported = mockVideoEncoderSupport[config.codec] !== false; // Default true if not explicitly false
                    return {
                        supported: isSupported,
                        config,
                        type: mockHardwareSupport[config.codec] ? 'hardware' : 'software' // Mock the 'type' property directly
                    };
                }
            },
            navigator: {
                mediaCapabilities: {
                    encodingInfo: async (config: MockMediaCapabilitiesConfig) => {
                         const codecMatch = config.video.contentType.match(/codecs=["']?([^"']+)["']?/);
                         const codec = codecMatch ? codecMatch[1] : '';

                         let isPowerEfficient = false;
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

        const originalIsConfigSupported = scope.VideoEncoder.isConfigSupported;
        scope.VideoEncoder = class MockVideoEncoder {
            static async isConfigSupported(config: MockVideoEncoderConfig) {
                return originalIsConfigSupported(config);
            }
            configure() {}
            encode() {}
            close() {}
        };

        const keys = Object.keys(scope);
        const values = Object.values(scope);
        const fn = new Function(...keys, 'return ' + scriptBody);
        const asyncFn = fn(...values);
        return asyncFn(args);
    };

    const createMockPage = (cb: (script: string, args: any) => Promise<any>) => ({
        viewportSize: () => ({ width: 1920, height: 1080 }),
        frames: () => [],
        evaluate: async (fn: any, args: any) => {
             if (typeof fn === 'string') {
                 const jsonMatch = fn.match(/\)\((\{.*\})\)\s*$/);
                 let parsedArgs = args;
                 if (jsonMatch) {
                     parsedArgs = JSON.parse(jsonMatch[1]);
                 }

                 const bodyMatch = fn.match(/^\s*\((async\s*\(.*?\)\s*=>\s*\{[\s\S]*?\})\)\(/);
                 if (bodyMatch) {
                     return cb(bodyMatch[1], parsedArgs);
                 }
             }
             return { supported: false, reason: 'Test Mock: Failed to parse script' };
        }
    } as any);

    // Setup: Both H.264 and VP9 are supported.
    // H.264 is Software only.
    // VP9 is Hardware accelerated.
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

    let capturedScript: string = '';
    let capturedArgs: any = null;

    // Capture the script using a dummy strategy
    const interceptorPage = createMockPage(async (script, args) => {
        capturedScript = script;
        capturedArgs = args;
        return { supported: false };
    });

    const dummyStrategy = new CanvasStrategy({
        width: 1920, height: 1080, fps: 30, videoCodec: 'copy'
    });

    try {
        await dummyStrategy.prepare(interceptorPage);
    } catch (e) {
        // Expected to fail/throw because we return supported: false
    }

    if (!capturedScript) {
        console.error('❌ Failed to capture script');
        process.exit(1);
    }

    console.log('Captured script successfully.');

    // Helper to run test with specific preference
    const testPreference = async (preference: 'hardware' | 'software' | 'disabled' | undefined) => {
        const args = { ...capturedArgs, webCodecsPreference: preference };
        return await executeBrowserScript(capturedScript, args);
    };

    // Test 1: Default (Hardware Preference)
    // Should select VP9 (Hardware) over H.264 (Software)
    {
        const result = await testPreference(undefined);
        console.log('Test 1 (Default/Hardware):', result.codec);
        if (result.codec && result.codec.includes('vp9')) {
             console.log('✅ Selected VP9 (Hardware)');
        } else {
             console.error(`❌ Expected VP9 (Hardware), got ${result.codec}`);
             process.exit(1);
        }
    }

    // Test 2: Explicit Hardware Preference
    // Should select VP9 (Hardware) over H.264 (Software)
    {
        const result = await testPreference('hardware');
        console.log('Test 2 (Explicit Hardware):', result.codec);
        if (result.codec && result.codec.includes('vp9')) {
             console.log('✅ Selected VP9 (Hardware)');
        } else {
             console.error(`❌ Expected VP9 (Hardware), got ${result.codec}`);
             process.exit(1);
        }
    }

    // Test 3: Software Preference
    // Should select H.264 (Software) over VP9 (Hardware)
    {
        const result = await testPreference('software');
        console.log('Test 3 (Software):', result.codec);
        // Expect H.264 (Software) because it's !isHardware
        if (result.codec && result.codec.includes('avc1')) {
             console.log('✅ Selected H.264 (Software)');
        } else {
             console.error(`❌ Expected H.264 (Software), got ${result.codec} (isHardware: ${mockHardwareSupport['vp9']})`);
             process.exit(1);
        }
    }

    // Test 4: Disabled Preference
    // Should return supported: false
    {
        const result = await testPreference('disabled');
        console.log('Test 4 (Disabled):', result);
        if (result.supported === false && result.reason === 'Disabled by user preference') {
             console.log('✅ correctly returned supported: false');
        } else {
             console.error(`❌ Expected supported: false, got ${JSON.stringify(result)}`);
             process.exit(1);
        }
    }
}

runTest().catch((e) => {
    console.error(e);
    process.exit(1);
});
