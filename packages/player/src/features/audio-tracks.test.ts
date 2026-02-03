// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HeliosAudioTrack, HeliosAudioTrackList, AudioTrackHost } from './audio-tracks';

class MockAudioTrackHost implements AudioTrackHost {
    handleAudioTrackEnabledChange = vi.fn();
}

describe('HeliosAudioTrack', () => {
    let track: HeliosAudioTrack;
    let host: MockAudioTrackHost;

    beforeEach(() => {
        host = new MockAudioTrackHost();
        track = new HeliosAudioTrack('track-1', 'main', 'Main Audio', 'en', true, host);
    });

    it('should initialize with correct properties', () => {
        expect(track.id).toBe('track-1');
        expect(track.kind).toBe('main');
        expect(track.label).toBe('Main Audio');
        expect(track.language).toBe('en');
        expect(track.enabled).toBe(true);
    });

    it('should trigger host callback when enabled changes', () => {
        track.enabled = false;
        expect(host.handleAudioTrackEnabledChange).toHaveBeenCalledWith(track);
        expect(track.enabled).toBe(false);
    });

    it('should NOT trigger host callback if enabled is set to same value', () => {
        track.enabled = true;
        expect(host.handleAudioTrackEnabledChange).not.toHaveBeenCalled();
    });

    it('should update enabled without triggering callback via internal method', () => {
        track._setEnabledInternal(false);
        expect(host.handleAudioTrackEnabledChange).not.toHaveBeenCalled();
        expect(track.enabled).toBe(false);
    });
});

describe('HeliosAudioTrackList', () => {
    let list: HeliosAudioTrackList;
    let host: MockAudioTrackHost;

    beforeEach(() => {
        list = new HeliosAudioTrackList();
        host = new MockAudioTrackHost();
    });

    it('should add tracks', () => {
        const track = new HeliosAudioTrack('1', '', '', '', true, host);
        list.addTrack(track);

        expect(list.length).toBe(1);
        expect(list[0]).toBe(track);
        expect(list.getTrackById('1')).toBe(track);
    });

    it('should remove tracks', () => {
        const track = new HeliosAudioTrack('1', '', '', '', true, host);
        list.addTrack(track);
        list.removeTrack(track);

        expect(list.length).toBe(0);
        expect(list.getTrackById('1')).toBeNull();
    });

    it('should dispatch addtrack event', () => {
        const spy = vi.fn();
        list.addEventListener('addtrack', spy);

        const track = new HeliosAudioTrack('1', '', '', '', true, host);
        list.addTrack(track);

        expect(spy).toHaveBeenCalled();
        expect(spy.mock.calls[0][0].track).toBe(track);
    });

    it('should dispatch removetrack event', () => {
        const track = new HeliosAudioTrack('1', '', '', '', true, host);
        list.addTrack(track);

        const spy = vi.fn();
        list.addEventListener('removetrack', spy);

        list.removeTrack(track);

        expect(spy).toHaveBeenCalled();
        expect(spy.mock.calls[0][0].track).toBe(track);
    });

    it('should dispatch change event', () => {
        const spy = vi.fn();
        list.addEventListener('change', spy);
        list.dispatchChangeEvent();
        expect(spy).toHaveBeenCalled();
    });

    it('should support onaddtrack property', () => {
        const spy = vi.fn();
        list.onaddtrack = spy;
        const track = new HeliosAudioTrack('1', '', '', '', true, host);
        list.addTrack(track);
        expect(spy).toHaveBeenCalled();
    });
});
