import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Helios } from './index';
import { effect } from './signals';

describe('Helios Signals API', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: any) => setTimeout(cb, 0));
    vi.stubGlobal('cancelAnimationFrame', (id: any) => clearTimeout(id));
    vi.stubGlobal('performance', { now: () => Date.now() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should expose public signals', () => {
    const helios = new Helios({ duration: 10, fps: 30 });

    expect(helios.currentFrame.value).toBe(0);
    expect(helios.isPlaying.value).toBe(false);
    expect(helios.playbackRate.value).toBe(1);
    expect(helios.inputProps.value).toEqual({});
  });

  it('should update signals on seek', () => {
    const helios = new Helios({ duration: 10, fps: 30 });

    let frameValue = -1;
    effect(() => {
      frameValue = helios.currentFrame.value;
    });

    expect(frameValue).toBe(0);

    helios.seek(30);
    expect(frameValue).toBe(30);
    expect(helios.currentFrame.value).toBe(30);
  });

  it('should update signals on play/pause', () => {
    const helios = new Helios({ duration: 10, fps: 30 });

    let playing = false;
    effect(() => {
      playing = helios.isPlaying.value;
    });

    expect(playing).toBe(false);

    helios.play();
    expect(playing).toBe(true);
    expect(helios.isPlaying.value).toBe(true);

    helios.pause();
    expect(playing).toBe(false);
    expect(helios.isPlaying.value).toBe(false);
  });

  it('should update signals on setInputProps', () => {
    const helios = new Helios({ duration: 10, fps: 30 });
    const props = { foo: 'bar' };

    let currentProps = {};
    effect(() => {
      currentProps = helios.inputProps.value;
    });

    helios.setInputProps(props);
    expect(currentProps).toEqual(props);
    expect(helios.inputProps.value).toEqual(props);
  });
});
