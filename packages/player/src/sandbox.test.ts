// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HeliosPlayer } from './index';

// Mock ClientSideExporter
vi.mock('./features/exporter', () => {
  return {
    ClientSideExporter: vi.fn()
  };
});

// Mock ResizeObserver
global.ResizeObserver = class {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
} as any;

describe('HeliosPlayer Sandbox', () => {
  let player: HeliosPlayer;

  beforeEach(() => {
    document.body.innerHTML = '';
    player = new HeliosPlayer();
    document.body.appendChild(player);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should have default sandbox flags when attribute is missing', () => {
    const iframe = player.shadowRoot!.querySelector('iframe');
    expect(iframe?.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin');
  });

  it('should update iframe sandbox when attribute is set', () => {
    player.setAttribute('sandbox', 'allow-scripts');
    const iframe = player.shadowRoot!.querySelector('iframe');
    expect(iframe?.getAttribute('sandbox')).toBe('allow-scripts');
  });

  it('should revert to default sandbox flags when attribute is removed', () => {
    player.setAttribute('sandbox', 'allow-scripts');
    player.removeAttribute('sandbox');
    const iframe = player.shadowRoot!.querySelector('iframe');
    expect(iframe?.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin');
  });

  it('should support empty string for strict sandbox', () => {
    player.setAttribute('sandbox', '');
    const iframe = player.shadowRoot!.querySelector('iframe');
    // Attribute exists but is empty
    expect(iframe?.getAttribute('sandbox')).toBe('');
  });

  it('should reload iframe when sandbox attribute changes if src is present', () => {
    player.setAttribute('src', 'test.html');
    const iframe = player.shadowRoot!.querySelector('iframe');

    // Initial state
    expect(iframe?.getAttribute('src')).toBe('test.html');

    // Spy on iframe src setter (simulated via reload logic check)
    // In our implementation, we expect loadIframe to be called, which sets src.
    // We can spy on the underlying method or check if src is re-set.
    // Since we can't easily spy on private methods, we can check if the src was reset.
    // Or we can attach a load listener to see if it fires again (JSDOM might not fire load for same src effectively without delay).

    // Better approach: Spy on the private method or observe behavior.
    // Let's rely on checking if `iframe.src` is set again.
    // In JSDOM, setting src to same value might trigger behavior.

    // Let's use a spy on the class prototype before instantiation if we really want to check method call,
    // but checking side effects is better.

    // We can spy on the setter of the iframe src property? No, it's a native property.

    // Let's verify that the `loadstart` event fires, which happens in `loadIframe`.
    const loadStartSpy = vi.fn();
    player.addEventListener('loadstart', loadStartSpy);

    player.setAttribute('sandbox', 'allow-scripts');

    expect(loadStartSpy).toHaveBeenCalled();
  });

  it('should NOT reload iframe when sandbox attribute changes if src is NOT present', () => {
    const loadStartSpy = vi.fn();
    player.addEventListener('loadstart', loadStartSpy);

    player.setAttribute('sandbox', 'allow-scripts');

    expect(loadStartSpy).not.toHaveBeenCalled();
  });
});
