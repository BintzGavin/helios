import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SharedAudioContextManager, SharedAudioSource } from './audio-context-manager';

// Mock AudioNodes
class MockAudioNode {
  connect = vi.fn();
  disconnect = vi.fn();
  context = { currentTime: 0 };
}

class MockGainNode extends MockAudioNode {
  gain = {
    value: 1,
    setTargetAtTime: vi.fn()
  };
}

class MockMediaElementAudioSourceNode extends MockAudioNode {}

// Mock AudioContext
class MockAudioContext {
  destination = new MockAudioNode();
  createMediaElementSource = vi.fn(() => new MockMediaElementAudioSourceNode());
  createGain = vi.fn(() => new MockGainNode());
}

// Attach mock to window
(window as any).AudioContext = MockAudioContext;

// Mock HTMLMediaElement
class MockHTMLMediaElement {
  volume = 1;
  muted = false;
  listeners: Record<string, Function[]> = {};

  addEventListener(event: string, callback: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  dispatchEvent(event: string) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb());
    }
  }
}

describe('SharedAudioContextManager', () => {
  beforeEach(() => {
    // Reset singleton instance using reflection
    (SharedAudioContextManager as any).instance = undefined;
  });

  it('should return a singleton instance', () => {
    const instance1 = SharedAudioContextManager.getInstance();
    const instance2 = SharedAudioContextManager.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should return the same SharedAudioSource for the same element', () => {
    const manager = SharedAudioContextManager.getInstance();
    const element = new MockHTMLMediaElement() as unknown as HTMLMediaElement;

    const source1 = manager.getSharedSource(element);
    const source2 = manager.getSharedSource(element);

    expect(source1).toBe(source2);
  });
});

describe('SharedAudioSource', () => {
  let context: MockAudioContext;
  let element: MockHTMLMediaElement;

  beforeEach(() => {
    context = new MockAudioContext();
    element = new MockHTMLMediaElement();
  });

  it('should initialize nodes and connections correctly', () => {
    const source = new SharedAudioSource(element as unknown as HTMLMediaElement, context as unknown as AudioContext);

    expect(context.createMediaElementSource).toHaveBeenCalledWith(element);
    expect(context.createGain).toHaveBeenCalledTimes(2); // fadeGainNode and gainNode

    const gainNode = context.createGain.mock.results[1].value as MockGainNode;
    expect(gainNode.gain.value).toBe(1);
  });

  it('should sync volume on volumechange event', () => {
    const source = new SharedAudioSource(element as unknown as HTMLMediaElement, context as unknown as AudioContext);
    const gainNode = context.createGain.mock.results[1].value as MockGainNode;

    element.volume = 0.5;
    element.dispatchEvent('volumechange');

    expect(gainNode.gain.value).toBe(0.5);
  });

  it('should handle muted state during syncVolume', () => {
    const source = new SharedAudioSource(element as unknown as HTMLMediaElement, context as unknown as AudioContext);
    const gainNode = context.createGain.mock.results[1].value as MockGainNode;

    element.muted = true;
    element.dispatchEvent('volumechange');

    expect(gainNode.gain.value).toBe(0);
  });

  it('should set fade gain via setTargetAtTime', () => {
    const source = new SharedAudioSource(element as unknown as HTMLMediaElement, context as unknown as AudioContext);
    const fadeGainNode = context.createGain.mock.results[0].value as MockGainNode;

    source.setFadeGain(0.8);

    expect(fadeGainNode.gain.setTargetAtTime).toHaveBeenCalledWith(0.8, 0, 0.01);
  });

  it('should silently handle errors in setFadeGain', () => {
    const source = new SharedAudioSource(element as unknown as HTMLMediaElement, context as unknown as AudioContext);
    const fadeGainNode = context.createGain.mock.results[0].value as MockGainNode;

    fadeGainNode.gain.setTargetAtTime.mockImplementationOnce(() => {
      throw new Error('Test Error');
    });

    expect(() => source.setFadeGain(0.8)).not.toThrow();
  });

  it('should connect external node to fadeGainNode', () => {
    const source = new SharedAudioSource(element as unknown as HTMLMediaElement, context as unknown as AudioContext);
    const fadeGainNode = context.createGain.mock.results[0].value as MockGainNode;
    const externalNode = new MockAudioNode() as unknown as AudioNode;

    source.connect(externalNode);

    expect(fadeGainNode.connect).toHaveBeenCalledWith(externalNode);
  });

  it('should silently handle errors in connect', () => {
    const source = new SharedAudioSource(element as unknown as HTMLMediaElement, context as unknown as AudioContext);
    const fadeGainNode = context.createGain.mock.results[0].value as MockGainNode;
    const externalNode = new MockAudioNode() as unknown as AudioNode;

    fadeGainNode.connect.mockImplementationOnce(() => {
      throw new Error('Test Error');
    });

    expect(() => source.connect(externalNode)).not.toThrow();
  });

  it('should disconnect external node from fadeGainNode', () => {
    const source = new SharedAudioSource(element as unknown as HTMLMediaElement, context as unknown as AudioContext);
    const fadeGainNode = context.createGain.mock.results[0].value as MockGainNode;
    const externalNode = new MockAudioNode() as unknown as AudioNode;

    source.disconnect(externalNode);

    expect(fadeGainNode.disconnect).toHaveBeenCalledWith(externalNode);
  });

  it('should silently handle errors in disconnect', () => {
    const source = new SharedAudioSource(element as unknown as HTMLMediaElement, context as unknown as AudioContext);
    const fadeGainNode = context.createGain.mock.results[0].value as MockGainNode;
    const externalNode = new MockAudioNode() as unknown as AudioNode;

    fadeGainNode.disconnect.mockImplementationOnce(() => {
      throw new Error('Test Error');
    });

    expect(() => source.disconnect(externalNode)).not.toThrow();
  });
});
