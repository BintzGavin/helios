import '@testing-library/jest-dom';

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock AudioContext for AudioWaveform
global.AudioContext = class AudioContext {
  createGain() { return { connect: () => {}, gain: { value: 1 } }; }
  createOscillator() { return { connect: () => {}, start: () => {}, stop: () => {} }; }
  createBufferSource() { return { connect: () => {}, start: () => {}, stop: () => {}, buffer: null }; }
  destination = {};
  currentTime = 0;
  decodeAudioData(_buffer: ArrayBuffer) {
    return Promise.resolve({
      length: 100,
      numberOfChannels: 1,
      sampleRate: 44100,
      duration: 1,
      getChannelData: () => new Float32Array(100)
    } as unknown as AudioBuffer);
  }
} as any;

global.OfflineAudioContext = global.AudioContext as any;
