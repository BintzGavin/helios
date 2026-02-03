import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HeliosTextTrackList, HeliosTextTrack } from './text-tracks';
import { HeliosAudioTrackList, HeliosAudioTrack } from './audio-tracks';

describe('Track Events Standard Compliance', () => {
    describe('HeliosTextTrackList', () => {
        let list: HeliosTextTrackList;

        beforeEach(() => {
            list = new HeliosTextTrackList();
        });

        it('should replace onaddtrack handler', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            list.onaddtrack = handler1;
            list.onaddtrack = handler2;

            const track = new HeliosTextTrack('captions', 'Test', 'en', { handleTrackModeChange: () => {} });
            list.addTrack(track);

            expect(handler1).not.toHaveBeenCalled();
            expect(handler2).toHaveBeenCalledTimes(1);
        });

        it('should replace onremovetrack handler', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();
            const track = new HeliosTextTrack('captions', 'Test', 'en', { handleTrackModeChange: () => {} });
            list.addTrack(track);

            list.onremovetrack = handler1;
            list.onremovetrack = handler2;

            list.removeTrack(track);

            expect(handler1).not.toHaveBeenCalled();
            expect(handler2).toHaveBeenCalledTimes(1);
        });

        it('should replace onchange handler', () => {
             const handler1 = vi.fn();
             const handler2 = vi.fn();

             list.onchange = handler1;
             list.onchange = handler2;

             // Use the helper method
             list.dispatchChangeEvent();

             expect(handler1).not.toHaveBeenCalled();
             expect(handler2).toHaveBeenCalledTimes(1);
        });
    });

    describe('HeliosAudioTrackList', () => {
        let list: HeliosAudioTrackList;

        beforeEach(() => {
            list = new HeliosAudioTrackList();
        });

        it('should replace onaddtrack handler', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            list.onaddtrack = handler1;
            list.onaddtrack = handler2;

            const track = new HeliosAudioTrack('1', 'main', 'Main', 'en', true, { handleAudioTrackEnabledChange: () => {} });
            list.addTrack(track);

            expect(handler1).not.toHaveBeenCalled();
            expect(handler2).toHaveBeenCalledTimes(1);
        });

        it('should replace onchange handler', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            list.onchange = handler1;
            list.onchange = handler2;

            list.dispatchChangeEvent();

            expect(handler1).not.toHaveBeenCalled();
            expect(handler2).toHaveBeenCalledTimes(1);
        });
    });
});
