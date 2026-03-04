import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HeliosPlayer } from '../index';
import { DirectController } from '../controllers';
import { Helios } from '@helios-project/core';

describe('HeliosPlayer Interaction Regression Tests', () => {
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

    it('should pass correct parameters to ClientSideExporter via export menu', async () => {
        // Mock setControlsDisabled to false manually so it can interact
        (player as any).setControlsDisabled(false);

        const exportSpy = vi.spyOn(player, 'export').mockImplementation(() => Promise.resolve());

        // Open the menu
        const exportBtn = player.shadowRoot!.querySelector('.export-btn') as HTMLButtonElement;
        exportBtn.disabled = false;
        exportBtn.click();

        const menu = player.shadowRoot!.querySelector('.export-menu') as HTMLDivElement;
        expect(menu.classList.contains('hidden')).toBe(false);

        // Change some options
        const filenameInput = menu.querySelector('.export-input') as HTMLInputElement;
        filenameInput.value = 'my_awesome_video';

        const formatSelect = menu.querySelectorAll('.export-select')[0] as HTMLSelectElement;
        formatSelect.value = 'webm';
        formatSelect.dispatchEvent(new Event('change')); // Trigger UI update

        const scaleSelect = menu.querySelectorAll('.export-select')[1] as HTMLSelectElement;
        scaleSelect.value = '0.5';

        // Check burn-in captions
        const captionsCheckbox = menu.querySelector('input[type="checkbox"]') as HTMLInputElement;
        captionsCheckbox.checked = true;

        // Click Export Action
        const actionBtn = menu.querySelector('.export-action-btn') as HTMLButtonElement;
        actionBtn.click();

        expect(exportSpy).toHaveBeenCalledTimes(1);

        // Verify the exact options passed down
        const passedOptions = exportSpy.mock.calls[0][0];
        expect(passedOptions).toBeDefined();
        if (passedOptions) {
            expect(passedOptions.filename).toBe('my_awesome_video');
            expect(passedOptions.format).toBe('webm');
            expect(passedOptions.width).toBe(1920 * 0.5); // videoWidth * 0.5
            expect(passedOptions.height).toBe(1080 * 0.5); // videoHeight * 0.5
            expect(passedOptions.includeCaptions).toBe(true);
            expect(passedOptions.signal).toBeInstanceOf(AbortSignal);
        }
    });

    it('should close other menus when a menu is opened', () => {
        (player as any).setControlsDisabled(false);
        const settingsBtn = player.shadowRoot!.querySelector('.settings-btn') as HTMLButtonElement;
        settingsBtn.disabled = false;
        const exportBtn = player.shadowRoot!.querySelector('.export-btn') as HTMLButtonElement;
        exportBtn.disabled = false;

        const settingsMenu = player.shadowRoot!.querySelector('.settings-menu') as HTMLDivElement;
        const exportMenu = player.shadowRoot!.querySelector('.export-menu') as HTMLDivElement;

        // Open settings
        settingsBtn.click();
        expect(settingsMenu.classList.contains('hidden')).toBe(false);
        expect(exportMenu.classList.contains('hidden')).toBe(true);

        // Open export (should close settings)
        exportBtn.click();
        expect(settingsMenu.classList.contains('hidden')).toBe(true);
        expect(exportMenu.classList.contains('hidden')).toBe(false);
    });
});
