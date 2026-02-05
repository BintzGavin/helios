// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioMeter } from './audio-metering';

describe('AudioMeter', () => {
  let audioMeter: AudioMeter;
  let mockAudioContext: any;
  let mockMediaElementSource: any;
  let mockGainNode: any;
  let mockSplitter: any;
  let mockAnalyser: any;
  let mockDestination: any;

  beforeEach(() => {
    mockMediaElementSource = {
      connect: vi.fn(),
      disconnect: vi.fn()
    };
    mockGainNode = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      gain: { value: 1 }
    };
    mockSplitter = {
      connect: vi.fn(),
      disconnect: vi.fn()
    };
    mockAnalyser = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      getFloatTimeDomainData: vi.fn(),
      fftSize: 2048
    };
    mockDestination = {};

    mockAudioContext = {
      createMediaElementSource: vi.fn(() => mockMediaElementSource),
      createGain: vi.fn(() => mockGainNode),
      createChannelSplitter: vi.fn(() => mockSplitter),
      createAnalyser: vi.fn(() => mockAnalyser),
      destination: mockDestination,
      state: 'suspended',
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined)
    };

    (window as any).AudioContext = vi.fn().mockImplementation(function() { return mockAudioContext; });
    (window as any).webkitAudioContext = vi.fn().mockImplementation(function() { return mockAudioContext; });

    audioMeter = new AudioMeter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize correctly', () => {
    expect(mockAudioContext.createChannelSplitter).toHaveBeenCalledWith(2);
    expect(mockAudioContext.createAnalyser).toHaveBeenCalledTimes(2);
    expect(mockSplitter.connect).toHaveBeenCalledTimes(2);
  });

  it('should connect playback path immediately but not metering path', () => {
    const mockElement = document.createElement('audio');
    const doc = { querySelectorAll: vi.fn(() => [mockElement]) } as any;

    audioMeter.connect(doc);

    // Verify context resumed
    expect(mockAudioContext.resume).toHaveBeenCalled();

    // Verify nodes created
    expect(mockAudioContext.createMediaElementSource).toHaveBeenCalledWith(mockElement);
    expect(mockAudioContext.createGain).toHaveBeenCalled();

    // Verify Playback Path (Source -> Gain -> Destination)
    expect(mockMediaElementSource.connect).toHaveBeenCalledWith(mockGainNode);
    expect(mockGainNode.connect).toHaveBeenCalledWith(mockDestination);

    // Verify Metering Path NOT connected (Source -> Splitter)
    expect(mockMediaElementSource.connect).not.toHaveBeenCalledWith(mockSplitter);
  });

  it('should connect metering path when enabled', () => {
    const mockElement = document.createElement('audio');
    const doc = { querySelectorAll: vi.fn(() => [mockElement]) } as any;

    audioMeter.connect(doc);
    audioMeter.enable();

    // Verify Metering Path Connected
    expect(mockMediaElementSource.connect).toHaveBeenCalledWith(mockSplitter);
  });

  it('should connect metering path immediately if already enabled', () => {
    const mockElement = document.createElement('audio');
    const doc = { querySelectorAll: vi.fn(() => [mockElement]) } as any;

    audioMeter.enable();
    audioMeter.connect(doc);

    // Verify Metering Path Connected
    expect(mockMediaElementSource.connect).toHaveBeenCalledWith(mockSplitter);
  });

  it('should disconnect only metering path when disabled', () => {
    const mockElement = document.createElement('audio');
    const doc = { querySelectorAll: vi.fn(() => [mockElement]) } as any;

    audioMeter.connect(doc);
    audioMeter.enable();

    // Reset mocks to clear previous calls
    mockMediaElementSource.disconnect.mockClear();

    audioMeter.disable();

    // Verify Metering Path Disconnected
    expect(mockMediaElementSource.disconnect).toHaveBeenCalledWith(mockSplitter);

    // Verify we didn't call disconnect() without args (which would disconnect everything)
    expect(mockMediaElementSource.disconnect).not.toHaveBeenCalledWith();
    // Verify we didn't disconnect gain node
    expect(mockMediaElementSource.disconnect).not.toHaveBeenCalledWith(mockGainNode);
  });

  it('should return zero levels when disabled', () => {
    const levels = audioMeter.getLevels();
    expect(levels).toEqual({ left: 0, right: 0, peakLeft: 0, peakRight: 0 });
    expect(mockAnalyser.getFloatTimeDomainData).not.toHaveBeenCalled();
  });

  it('should dispose correctly', () => {
    const mockElement = document.createElement('audio');
    const doc = { querySelectorAll: vi.fn(() => [mockElement]) } as any;

    audioMeter.connect(doc);

    audioMeter.dispose();

    expect(mockMediaElementSource.disconnect).toHaveBeenCalled();
    expect(mockGainNode.disconnect).toHaveBeenCalled();
    expect(mockSplitter.disconnect).toHaveBeenCalled();
    expect(mockAudioContext.close).toHaveBeenCalled();
  });
});
