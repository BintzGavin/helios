// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioMeter } from './audio-metering';
import { SharedAudioContextManager } from './audio-context-manager';

// Mock the SharedAudioContextManager module
vi.mock('./audio-context-manager', () => {
  return {
    SharedAudioContextManager: {
      getInstance: vi.fn(),
    },
    SharedAudioSource: vi.fn(),
  };
});

describe('AudioMeter', () => {
  let audioMeter: AudioMeter;
  let mockAudioContext: any;
  let mockSplitter: any;
  let mockAnalyser: any;
  let mockDestination: any;
  let mockSharedSource: any;
  let mockManager: any;

  beforeEach(() => {
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
      createChannelSplitter: vi.fn(() => mockSplitter),
      createAnalyser: vi.fn(() => mockAnalyser),
      destination: mockDestination,
      state: 'suspended',
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined)
    };

    mockSharedSource = {
        connect: vi.fn(),
        disconnect: vi.fn()
    };

    mockManager = {
        context: mockAudioContext,
        getSharedSource: vi.fn(() => mockSharedSource)
    };

    (SharedAudioContextManager.getInstance as any).mockReturnValue(mockManager);

    audioMeter = new AudioMeter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize correctly', () => {
    expect(SharedAudioContextManager.getInstance).toHaveBeenCalled();
    expect(mockAudioContext.createChannelSplitter).toHaveBeenCalledWith(2);
    expect(mockAudioContext.createAnalyser).toHaveBeenCalledTimes(2);
    expect(mockSplitter.connect).toHaveBeenCalledTimes(2);
  });

  it('should get shared source and connect metering path when enabled', () => {
    const mockElement = document.createElement('audio');
    const doc = { querySelectorAll: vi.fn(() => [mockElement]) } as any;

    audioMeter.enable();
    audioMeter.connect(doc);

    expect(mockManager.getSharedSource).toHaveBeenCalledWith(mockElement);
    expect(mockSharedSource.connect).toHaveBeenCalledWith(mockSplitter);
  });

  it('should not connect metering path if disabled', () => {
    const mockElement = document.createElement('audio');
    const doc = { querySelectorAll: vi.fn(() => [mockElement]) } as any;

    audioMeter.connect(doc);

    expect(mockManager.getSharedSource).toHaveBeenCalledWith(mockElement);
    expect(mockSharedSource.connect).not.toHaveBeenCalled();
  });

  it('should disconnect metering path when disabled', () => {
    const mockElement = document.createElement('audio');
    const doc = { querySelectorAll: vi.fn(() => [mockElement]) } as any;

    audioMeter.connect(doc);
    audioMeter.enable();

    // Reset mocks
    mockSharedSource.disconnect.mockClear();

    audioMeter.disable();

    expect(mockSharedSource.disconnect).toHaveBeenCalledWith(mockSplitter);
  });

  it('should dispose correctly WITHOUT closing context', () => {
    const mockElement = document.createElement('audio');
    const doc = { querySelectorAll: vi.fn(() => [mockElement]) } as any;

    audioMeter.connect(doc);
    audioMeter.dispose();

    expect(mockSharedSource.disconnect).toHaveBeenCalledWith(mockSplitter);
    expect(mockSplitter.disconnect).toHaveBeenCalled();

    // CRITICAL CHECK: Ensure we DO NOT close the shared context
    expect(mockAudioContext.close).not.toHaveBeenCalled();
  });
});
