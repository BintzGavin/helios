import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAudioAssets } from './audio-utils';

// Mock fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('getAudioAssets - Video Volume', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        fetchMock.mockResolvedValue({
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
            headers: { get: () => 'audio/mpeg' }
        });
    });

    it('prioritizes runtime volume property over volume attribute', async () => {
        const doc = document.implementation.createHTMLDocument();
        const video = doc.createElement('video');
        video.src = 'http://example.com/video.mp4';

        // Scenario: Attribute is set to '1' (default), but runtime volume is changed to '0.5'
        video.setAttribute('volume', '1');
        video.volume = 0.5;

        doc.body.appendChild(video);

        const assets = await getAudioAssets(doc);

        expect(assets).toHaveLength(1);
        expect(assets[0].volume).toBe(0.5);
    });

    it('prioritizes runtime muted property', async () => {
        const doc = document.implementation.createHTMLDocument();
        const video = doc.createElement('video');
        video.src = 'http://example.com/video.mp4';

        // Scenario: Attribute 'muted' is present (initially muted), but runtime unmuted
        video.setAttribute('muted', '');
        video.muted = false;

        doc.body.appendChild(video);

        const assets = await getAudioAssets(doc);

        expect(assets).toHaveLength(1);
        expect(assets[0].muted).toBe(false);
    });
});
