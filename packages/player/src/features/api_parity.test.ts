import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { HeliosPlayer } from '../index';
import { DirectController } from '../controllers';
import { Helios } from '@helios-project/core';

describe('HeliosPlayer API Parity Regression Tests', () => {
    let player: HeliosPlayer;
    let helios: Helios;

    beforeEach(() => {
        // Mock ResizeObserver
        global.ResizeObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
        };

        // Mock AudioContext
        if (!window.AudioContext) {
            (window as any).AudioContext = class {
                createGain() { return { gain: { value: 1, linearRampToValueAtTime: () => {} }, connect: () => {} }; }
                createOscillator() { return { connect: () => {}, start: () => {}, stop: () => {} }; }
                resume() { return Promise.resolve(); }
                suspend() { return Promise.resolve(); }
            };
        }

        player = new HeliosPlayer();
        document.body.appendChild(player);

        helios = new Helios({ width: 1920, height: 1080, fps: 30, duration: 10 });
        const controller = new DirectController(helios, player.shadowRoot!.querySelector('iframe')!);
        // @ts-ignore
        player.setController(controller);
    });

    afterEach(() => {
        document.body.removeChild(player);
        helios.dispose();
        vi.restoreAllMocks();
    });

    it('should correctly flip seeking state during async seek', async () => {
        let seekingEvents = 0;
        let seekedEvents = 0;

        player.addEventListener('seeking', () => seekingEvents++);
        player.addEventListener('seeked', () => seekedEvents++);

        expect(player.seeking).toBe(false);

        // Standard Media API uses seconds
        player.currentTime = 5;

        // Synchronously seeking should be true before the promise resolves
        expect(player.seeking).toBe(true);
        expect(seekingEvents).toBe(1);
        expect(seekedEvents).toBe(0);

        // Wait for the seek to complete
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(player.seeking).toBe(false);
        expect(seekedEvents).toBe(1);
    });

    it('should persist volume and muted state across iframe reloads', () => {
        player.volume = 0.5;
        player.muted = true;

        expect(player.volume).toBe(0.5);
        expect(player.muted).toBe(true);

        // Unload controller to simulate reload
        // @ts-ignore
        player.controller.dispose();
        // @ts-ignore
        player.controller = null;

        // State should still be accessible
        expect(player.volume).toBe(0.5);
        expect(player.muted).toBe(true);

        // Re-attach
        const helios2 = new Helios({ width: 1920, height: 1080, fps: 30, duration: 10 });
        const controller2 = new DirectController(helios2, player.shadowRoot!.querySelector('iframe')!);
        // @ts-ignore
        player.setController(controller2);

        // New controller should have inherited the state
        expect(player.volume).toBe(0.5);
        expect(player.muted).toBe(true);
        expect(helios2.getState().volume).toBe(0.5);
        expect(helios2.getState().muted).toBe(true);
    });
});
