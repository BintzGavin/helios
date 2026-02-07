// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HeliosPlayer } from './index';

// Mock ResizeObserver
global.ResizeObserver = class {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
} as any;

describe('HeliosPlayer Event Handlers', () => {
  let player: HeliosPlayer;

  beforeEach(() => {
    document.body.innerHTML = '';
    player = new HeliosPlayer();
    document.body.appendChild(player);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should call onplay handler when play event is dispatched', () => {
    const handler = vi.fn();
    player.onplay = handler;
    player.dispatchEvent(new Event('play'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should remove old onplay handler when replaced', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    player.onplay = handler1;
    player.onplay = handler2;
    player.dispatchEvent(new Event('play'));
    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it('should remove onplay handler when set to null', () => {
    const handler = vi.fn();
    player.onplay = handler;
    player.onplay = null;
    player.dispatchEvent(new Event('play'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('should support all standard event handlers', () => {
    const events = [
      'pause', 'ended', 'timeupdate', 'volumechange', 'ratechange',
      'durationchange', 'seeking', 'seeked', 'resize', 'loadstart',
      'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough',
      'error', 'enterpictureinpicture', 'leavepictureinpicture'
    ];

    events.forEach(eventName => {
      const handler = vi.fn();
      const propName = 'on' + eventName;
      // @ts-ignore
      player[propName] = handler;

      player.dispatchEvent(new Event(eventName));
      expect(handler).toHaveBeenCalledTimes(1);

      // Cleanup
      // @ts-ignore
      player[propName] = null;
      player.dispatchEvent(new Event(eventName));
      expect(handler).toHaveBeenCalledTimes(1); // Should not increase
    });
  });
});
