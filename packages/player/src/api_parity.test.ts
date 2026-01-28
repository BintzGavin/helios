// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HeliosPlayer } from './index';

// Mock ResizeObserver
global.ResizeObserver = class {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
} as any;

describe('HeliosPlayer API Parity', () => {
  let player: HeliosPlayer;

  beforeEach(() => {
    document.body.innerHTML = '';
    player = new HeliosPlayer();
    document.body.appendChild(player);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should reflect src attribute as property', () => {
    player.setAttribute('src', 'test.html');
    expect(player.src).toBe('test.html');

    player.src = 'other.html';
    expect(player.getAttribute('src')).toBe('other.html');
  });

  it('should reflect autoplay attribute as boolean property', () => {
    expect(player.autoplay).toBe(false);

    player.setAttribute('autoplay', '');
    expect(player.autoplay).toBe(true);

    player.removeAttribute('autoplay');
    expect(player.autoplay).toBe(false);

    player.autoplay = true;
    expect(player.hasAttribute('autoplay')).toBe(true);

    player.autoplay = false;
    expect(player.hasAttribute('autoplay')).toBe(false);
  });

  it('should reflect loop attribute as boolean property', () => {
    expect(player.loop).toBe(false);

    player.setAttribute('loop', '');
    expect(player.loop).toBe(true);

    player.loop = true;
    expect(player.hasAttribute('loop')).toBe(true);

    player.loop = false;
    expect(player.hasAttribute('loop')).toBe(false);
  });

  it('should reflect controls attribute as boolean property', () => {
    expect(player.controls).toBe(false);

    player.setAttribute('controls', '');
    expect(player.controls).toBe(true);

    player.controls = true;
    expect(player.hasAttribute('controls')).toBe(true);

    player.controls = false;
    expect(player.hasAttribute('controls')).toBe(false);
  });

  it('should reflect poster attribute as property', () => {
    player.setAttribute('poster', 'image.jpg');
    expect(player.poster).toBe('image.jpg');

    player.poster = 'other.jpg';
    expect(player.getAttribute('poster')).toBe('other.jpg');
  });

  it('should reflect preload attribute as property', () => {
    // Default is usually auto, but let's check what attribute says
    expect(player.preload).toBe('auto'); // Assuming default return if missing

    player.setAttribute('preload', 'none');
    expect(player.preload).toBe('none');

    player.preload = 'auto';
    expect(player.getAttribute('preload')).toBe('auto');
  });
});
