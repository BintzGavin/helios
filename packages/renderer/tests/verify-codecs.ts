import { CanvasStrategy } from '../src/strategies/CanvasStrategy';
import { DomStrategy } from '../src/strategies/DomStrategy';
import { RendererOptions } from '../src/types';

function runTests() {
  console.log('Running Codec Configuration Verification...');
  let hasError = false;

  const dummyOptions: RendererOptions = {
    width: 1920,
    height: 1080,
    fps: 30,
    durationInSeconds: 1,
    mode: 'canvas',
  };

  const strategies = [
    { name: 'CanvasStrategy', instance: new CanvasStrategy(dummyOptions) },
    { name: 'DomStrategy', instance: new DomStrategy(dummyOptions) },
  ];

  for (const { name, instance } of strategies) {
    console.log(`\nTesting ${name}...`);

    // Test 1: Defaults
    const defaultOptions: RendererOptions = {
      width: 1920,
      height: 1080,
      fps: 30,
      durationInSeconds: 1,
      mode: 'canvas',
    };
    const defaultArgs = instance.getFFmpegArgs(defaultOptions, 'out.mp4');

    if (!defaultArgs.includes('libx264')) {
      console.error(`❌ ${name} failed default codec: Expected libx264`);
      hasError = true;
    } else {
        console.log(`✅ ${name} default codec passed`);
    }

    if (!defaultArgs.includes('yuv420p')) {
      console.error(`❌ ${name} failed default pix_fmt: Expected yuv420p`);
      hasError = true;
    } else {
        console.log(`✅ ${name} default pix_fmt passed`);
    }

    // Test 2: Custom Codec and Pixel Format
    const customOptions: RendererOptions = {
        ...defaultOptions,
        videoCodec: 'prores_ks',
        pixelFormat: 'yuva444p10le',
    };
    const customArgs = instance.getFFmpegArgs(customOptions, 'out.mov');

    if (!customArgs.includes('prores_ks')) {
      console.error(`❌ ${name} failed custom codec: Expected prores_ks`);
      hasError = true;
    } else {
        console.log(`✅ ${name} custom codec passed`);
    }

    if (!customArgs.includes('yuva444p10le')) {
        console.error(`❌ ${name} failed custom pix_fmt: Expected yuva444p10le`);
        hasError = true;
    } else {
        console.log(`✅ ${name} custom pix_fmt passed`);
    }

    // Test 3: CRF and Preset
    const qualityOptions: RendererOptions = {
        ...defaultOptions,
        crf: 18,
        preset: 'veryslow',
    };
    const qualityArgs = instance.getFFmpegArgs(qualityOptions, 'out.mp4');

    if (!qualityArgs.includes('-crf') || !qualityArgs.includes('18')) {
        console.error(`❌ ${name} failed CRF: Expected -crf 18`);
        hasError = true;
    } else {
        console.log(`✅ ${name} CRF passed`);
    }

    if (!qualityArgs.includes('-preset') || !qualityArgs.includes('veryslow')) {
        console.error(`❌ ${name} failed preset: Expected -preset veryslow`);
        hasError = true;
    } else {
        console.log(`✅ ${name} preset passed`);
    }

    // Test 4: Bitrate
    const bitrateOptions: RendererOptions = {
        ...defaultOptions,
        videoBitrate: '5M',
    };
    const bitrateArgs = instance.getFFmpegArgs(bitrateOptions, 'out.mp4');

    if (!bitrateArgs.includes('-b:v') || !bitrateArgs.includes('5M')) {
        console.error(`❌ ${name} failed bitrate: Expected -b:v 5M`);
        hasError = true;
    } else {
        console.log(`✅ ${name} bitrate passed`);
    }
  }

  if (hasError) {
    console.error('\n❌ Verification Failed.');
    process.exit(1);
  } else {
    console.log('\n✅ All verification tests passed!');
    process.exit(0);
  }
}

runTests();
