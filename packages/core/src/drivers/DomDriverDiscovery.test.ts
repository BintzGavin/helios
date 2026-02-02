// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DomDriver } from './DomDriver.js';
import { Helios } from '../Helios.js';

describe('DomDriver Discovery', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should discover audio tracks on init', () => {
    container.innerHTML = `
      <audio data-helios-track-id="track1"></audio>
      <video data-helios-track-id="track2"></video>
    `;

    const driver = new DomDriver();
    let discovered: string[] = [];

    // We expect subscribeToMetadata to exist
    (driver as any).subscribeToMetadata((meta: any) => {
      if (meta.audioTracks) discovered = meta.audioTracks.map((t: any) => t.id);
    });

    driver.init(container);

    expect(discovered).toContain('track1');
    expect(discovered).toContain('track2');
    expect(discovered.length).toBe(2);
  });

  it('should discover audio tracks when added dynamically', async () => {
    const driver = new DomDriver();
    let discovered: string[] = [];

    (driver as any).subscribeToMetadata((meta: any) => {
       if (meta.audioTracks) discovered = meta.audioTracks.map((t: any) => t.id);
    });

    driver.init(container);
    expect(discovered).toEqual([]);

    const audio = document.createElement('audio');
    audio.setAttribute('data-helios-track-id', 'dynamic-track');
    container.appendChild(audio);

    // MutationObserver needs time
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(discovered).toContain('dynamic-track');
  });

  it('should remove audio tracks when element is removed', async () => {
     container.innerHTML = `<audio data-helios-track-id="removable"></audio>`;
     const driver = new DomDriver();
     let discovered: string[] = [];

     (driver as any).subscribeToMetadata((meta: any) => {
        if (meta.audioTracks) discovered = meta.audioTracks.map((t: any) => t.id);
     });

     driver.init(container);
     expect(discovered).toContain('removable');

     container.innerHTML = '';

     await new Promise(resolve => setTimeout(resolve, 50));

     expect(discovered).toEqual([]);
  });

  it('should handle duplicate track IDs correctly', async () => {
    container.innerHTML = `
      <audio id="a1" data-helios-track-id="shared"></audio>
      <audio id="a2" data-helios-track-id="shared"></audio>
    `;
    const driver = new DomDriver();
    let discovered: string[] = [];

    (driver as any).subscribeToMetadata((meta: any) => {
       if (meta.audioTracks) discovered = meta.audioTracks.map((t: any) => t.id);
    });

    driver.init(container);
    expect(discovered).toEqual(['shared']);

    // Remove one
    const a1 = document.getElementById('a1');
    a1?.remove();

    await new Promise(resolve => setTimeout(resolve, 50));

    // Should still be there because a2 exists
    expect(discovered).toEqual(['shared']);

    // Remove other
    const a2 = document.getElementById('a2');
    a2?.remove();

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(discovered).toEqual([]);
  });

  it('should detect when track ID attribute changes', async () => {
    container.innerHTML = `<audio data-helios-track-id="initial"></audio>`;
    const driver = new DomDriver();
    let discovered: string[] = [];

    (driver as any).subscribeToMetadata((meta: any) => {
       if (meta.audioTracks) discovered = meta.audioTracks.map((t: any) => t.id);
    });

    driver.init(container);
    expect(discovered).toContain('initial');

    const audio = container.querySelector('audio')!;
    audio.setAttribute('data-helios-track-id', 'updated');

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(discovered).not.toContain('initial');
    expect(discovered).toContain('updated');
  });
});

describe('Helios Audio Track Integration', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should expose availableAudioTracks from driver', async () => {
     const helios = new Helios({
       duration: 1,
       fps: 30,
       animationScope: container,
       autoSyncAnimations: true
     });

     // We expect availableAudioTracks to exist
     expect((helios as any).availableAudioTracks.value).toEqual([]);

     const audio = document.createElement('audio');
     audio.setAttribute('data-helios-track-id', 'helios-track');
     container.appendChild(audio);

     await new Promise(resolve => setTimeout(resolve, 50));

     expect((helios as any).availableAudioTracks.value.map((t: any) => t.id)).toEqual(['helios-track']);
  });
});
