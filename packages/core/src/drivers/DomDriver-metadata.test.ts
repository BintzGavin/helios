// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DomDriver } from './DomDriver.js';
import { Helios } from '../Helios.js';
import { AudioTrackMetadata } from './TimeDriver.js';

describe('DomDriver Metadata Discovery', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should discover audio tracks with default metadata', () => {
    const audio = document.createElement('audio');
    audio.setAttribute('data-helios-track-id', 'track1');
    container.appendChild(audio);

    const driver = new DomDriver();
    let discovered: AudioTrackMetadata[] = [];

    driver.subscribeToMetadata((meta) => {
      if (meta.audioTracks) discovered = meta.audioTracks;
    });

    driver.init(container);

    expect(discovered).toHaveLength(1);
    expect(discovered[0]).toEqual({
      id: 'track1',
      startTime: 0,
      duration: 0,
      fadeInDuration: 0,
      fadeOutDuration: 0
    });
  });

  it('should extract start time from data-helios-offset', () => {
    const audio = document.createElement('audio');
    audio.setAttribute('data-helios-track-id', 'track-offset');
    audio.setAttribute('data-helios-offset', '5.5');
    container.appendChild(audio);

    const driver = new DomDriver();
    let discovered: AudioTrackMetadata[] = [];

    driver.subscribeToMetadata((meta) => {
      if (meta.audioTracks) discovered = meta.audioTracks;
    });

    driver.init(container);

    expect(discovered).toHaveLength(1);
    expect(discovered[0].startTime).toBe(5.5);
  });

  it('should discover fade metadata', () => {
    const audio = document.createElement('audio');
    audio.setAttribute('data-helios-track-id', 'track-fade');
    audio.setAttribute('data-helios-fade-in', '1.5');
    audio.setAttribute('data-helios-fade-out', '2.0');
    container.appendChild(audio);

    const driver = new DomDriver();
    let discovered: AudioTrackMetadata[] = [];

    driver.subscribeToMetadata((meta) => {
      if (meta.audioTracks) discovered = meta.audioTracks;
    });

    driver.init(container);

    expect(discovered).toHaveLength(1);
    expect(discovered[0]).toMatchObject({
      id: 'track-fade',
      fadeInDuration: 1.5,
      fadeOutDuration: 2.0
    });
  });

  it('should update metadata when fade attributes change', async () => {
    const audio = document.createElement('audio');
    audio.setAttribute('data-helios-track-id', 'track-fade-mutate');
    audio.setAttribute('data-helios-fade-in', '0');
    container.appendChild(audio);

    const driver = new DomDriver();
    let discovered: AudioTrackMetadata[] = [];

    driver.subscribeToMetadata((meta) => {
      if (meta.audioTracks) discovered = meta.audioTracks;
    });

    driver.init(container);

    expect(discovered[0].fadeInDuration).toBe(0);

    // Update attribute
    audio.setAttribute('data-helios-fade-in', '3.0');

    // Wait for MutationObserver
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(discovered[0].fadeInDuration).toBe(3.0);
  });

  it('should update metadata when duration changes', async () => {
    const audio = document.createElement('audio');
    audio.setAttribute('data-helios-track-id', 'track-duration');
    container.appendChild(audio);

    const driver = new DomDriver();
    let discovered: AudioTrackMetadata[] = [];

    driver.subscribeToMetadata((meta) => {
      if (meta.audioTracks) discovered = meta.audioTracks;
    });

    driver.init(container);

    expect(discovered[0].duration).toBe(0);

    // Mock duration change
    Object.defineProperty(audio, 'duration', { value: 15.5, configurable: true });
    audio.dispatchEvent(new Event('durationchange'));

    // Wait for update (DomDriver handles it synchronously via event listener but let's be safe)
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(discovered[0].duration).toBe(15.5);
  });

  it('should update metadata when offset attribute changes', async () => {
    const audio = document.createElement('audio');
    audio.setAttribute('data-helios-track-id', 'track-mutate');
    audio.setAttribute('data-helios-offset', '10');
    container.appendChild(audio);

    const driver = new DomDriver();
    let discovered: AudioTrackMetadata[] = [];

    driver.subscribeToMetadata((meta) => {
      if (meta.audioTracks) discovered = meta.audioTracks;
    });

    driver.init(container);

    expect(discovered[0].startTime).toBe(10);

    // Update attribute
    audio.setAttribute('data-helios-offset', '20');

    // Wait for MutationObserver
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(discovered[0].startTime).toBe(20);
  });

  it('should handle multiple tracks with different metadata', () => {
    const a1 = document.createElement('audio');
    a1.setAttribute('data-helios-track-id', 't1');
    a1.setAttribute('data-helios-offset', '1');
    Object.defineProperty(a1, 'duration', { value: 10, configurable: true });

    const a2 = document.createElement('audio');
    a2.setAttribute('data-helios-track-id', 't2');
    a2.setAttribute('data-helios-offset', '2');
    Object.defineProperty(a2, 'duration', { value: 20, configurable: true });

    container.appendChild(a1);
    container.appendChild(a2);

    const driver = new DomDriver();
    let discovered: AudioTrackMetadata[] = [];

    driver.subscribeToMetadata((meta) => {
      if (meta.audioTracks) discovered = meta.audioTracks;
    });

    driver.init(container);

    expect(discovered).toHaveLength(2);
    const t1 = discovered.find(t => t.id === 't1');
    const t2 = discovered.find(t => t.id === 't2');

    expect(t1).toEqual({ id: 't1', startTime: 1, duration: 10, fadeInDuration: 0, fadeOutDuration: 0 });
    expect(t2).toEqual({ id: 't2', startTime: 2, duration: 20, fadeInDuration: 0, fadeOutDuration: 0 });
  });

  it('should stop listening when element is removed', async () => {
    const audio = document.createElement('audio');
    audio.setAttribute('data-helios-track-id', 'removed-track');
    container.appendChild(audio);

    const driver = new DomDriver();
    let updates = 0;

    driver.subscribeToMetadata(() => {
      updates++;
    });

    driver.init(container);
    // Initial update (1 from subscribe, 1 from scan)
    expect(updates).toBe(2);

    // Remove element
    container.removeChild(audio);

    // Wait for MutationObserver
    await new Promise(resolve => setTimeout(resolve, 50));
    // Should trigger update (empty list)
    expect(updates, 'Update count after removal').toBe(3);

    // Trigger duration change on removed element
    Object.defineProperty(audio, 'duration', { value: 100, configurable: true });
    audio.dispatchEvent(new Event('durationchange'));

    // Should NOT trigger another update
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(updates, 'Update count after duration change').toBe(3);
  });
});
