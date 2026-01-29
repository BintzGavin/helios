// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HeliosPlayer } from './index';

// Mock ResizeObserver
global.ResizeObserver = class {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
} as any;

describe('HeliosPlayer Interaction Fixes', () => {
  let player: HeliosPlayer;

  beforeEach(() => {
    document.body.innerHTML = '';
    player = new HeliosPlayer();
    document.body.appendChild(player);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('should focus the player when click-layer is clicked', () => {
    const clickLayer = player.shadowRoot!.querySelector('.click-layer') as HTMLDivElement;
    expect(clickLayer).toBeTruthy();

    // Ensure player is not focused initially
    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }
    expect(document.activeElement).not.toBe(player);

    // Click
    clickLayer.click();

    // Expect player to be focused
    expect(document.activeElement).toBe(player);
  });
});
