// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HeliosTextTrack, CueClass, TrackHost } from './text-tracks';

class MockTrackHost implements TrackHost {
    handleTrackModeChange = vi.fn();
}

describe('HeliosTextTrack', () => {
    let track: HeliosTextTrack;
    let host: MockTrackHost;

    beforeEach(() => {
        host = new MockTrackHost();
        track = new HeliosTextTrack('captions', 'English', 'en', host);
    });

    it('should initialize with empty cues', () => {
        expect(track.cues).toHaveLength(0);
        expect(track.activeCues).toHaveLength(0);
    });

    it('should add cues', () => {
        const cue = new CueClass(0, 5, 'Hello');
        track.addCue(cue);
        expect(track.cues).toHaveLength(1);
        expect(track.cues[0]).toBe(cue);
    });

    it('should update activeCues based on time', () => {
        const cue1 = new CueClass(0, 5, 'Hello');
        const cue2 = new CueClass(5, 10, 'World');
        track.addCue(cue1);
        track.addCue(cue2);

        track.mode = 'showing';

        // Time 2: Inside cue1
        track.updateActiveCues(2);
        expect(track.activeCues).toHaveLength(1);
        expect(track.activeCues[0]).toBe(cue1);

        // Time 5: End of cue1, Start of cue2
        // HTML5 spec: start is inclusive, end is exclusive (usually)
        // But let's check our implementation. We plan to use `startTime <= t < endTime`?
        // Wait, standard WebVTT/HTML5 behavior:
        // "A cue is active if... current playback position ... is within the cue's time interval."
        // Usually [start, end).
        track.updateActiveCues(5);
        expect(track.activeCues).toHaveLength(1);
        expect(track.activeCues[0]).toBe(cue2);

        // Time 12: Outside all
        track.updateActiveCues(12);
        expect(track.activeCues).toHaveLength(0);
    });

    it('should dispatch cuechange event when activeCues changes', () => {
        const cue = new CueClass(0, 5, 'Hello');
        track.addCue(cue);
        track.mode = 'showing';

        const spy = vi.fn();
        track.addEventListener('cuechange', spy);

        // Enter cue
        track.updateActiveCues(1);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(track.activeCues[0]).toBe(cue);

        // Move within cue (no change)
        track.updateActiveCues(2);
        expect(spy).toHaveBeenCalledTimes(1);

        // Exit cue
        track.updateActiveCues(6);
        expect(spy).toHaveBeenCalledTimes(2);
        expect(track.activeCues).toHaveLength(0);
    });

    it('should not update activeCues if mode is disabled', () => {
        const cue = new CueClass(0, 5, 'Hello');
        track.addCue(cue);
        track.mode = 'disabled';

        track.updateActiveCues(2);
        expect(track.activeCues).toHaveLength(0);
    });

    it('should clear activeCues when switching to disabled', () => {
        const cue = new CueClass(0, 5, 'Hello');
        track.addCue(cue);
        track.mode = 'showing';

        track.updateActiveCues(2);
        expect(track.activeCues).toHaveLength(1);

        track.mode = 'disabled';
        // Usually, disabling clears immediately or on next update?
        // The spec says: "Whenever the text track mode ... is changed to disabled ... active cues ... is null".
        // Our implementation of `mode` setter doesn't strictly clear it yet, but `updateActiveCues` should handle it.
        // Let's assume we call updateActiveCues after mode change or next tick.

        track.updateActiveCues(2);
        expect(track.activeCues).toHaveLength(0);
    });

    it('should support oncuechange property', () => {
        const spy = vi.fn();
        (track as any).oncuechange = spy;

        track.dispatchEvent(new Event('cuechange'));
        expect(spy).toHaveBeenCalled();
    });

    it('should dispatch cuechange event when activeCues are cleared due to disabling', () => {
        const cue = new CueClass(0, 5, 'Hello');
        track.addCue(cue);
        track.mode = 'showing';
        track.updateActiveCues(2);
        expect(track.activeCues).toHaveLength(1);

        const spy = vi.fn();
        track.addEventListener('cuechange', spy);

        track.mode = 'disabled';
        track.updateActiveCues(2);

        expect(track.activeCues).toHaveLength(0);
        expect(spy).toHaveBeenCalledTimes(1);
    });
});
