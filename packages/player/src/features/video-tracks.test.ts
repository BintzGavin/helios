import { describe, it, expect, vi } from 'vitest';
import { HeliosVideoTrack, HeliosVideoTrackList, VideoTrackHost } from './video-tracks';

describe('HeliosVideoTrack', () => {
  it('should initialize with correct properties', () => {
    const host = { handleVideoTrackSelectedChange: vi.fn() };
    const track = new HeliosVideoTrack('v1', 'main', 'Main Video', 'en', true, host);

    expect(track.id).toBe('v1');
    expect(track.kind).toBe('main');
    expect(track.label).toBe('Main Video');
    expect(track.language).toBe('en');
    expect(track.selected).toBe(true);
  });

  it('should notify host on selection change', () => {
    const host = { handleVideoTrackSelectedChange: vi.fn() };
    const track = new HeliosVideoTrack('v1', 'main', 'Main Video', 'en', false, host);

    track.selected = true;
    expect(host.handleVideoTrackSelectedChange).toHaveBeenCalledWith(track);
    expect(track.selected).toBe(true);

    track.selected = false;
    expect(host.handleVideoTrackSelectedChange).toHaveBeenCalledTimes(2);
    expect(track.selected).toBe(false);
  });

  it('should not notify host if value is unchanged', () => {
    const host = { handleVideoTrackSelectedChange: vi.fn() };
    const track = new HeliosVideoTrack('v1', 'main', 'Main Video', 'en', true, host);

    track.selected = true;
    expect(host.handleVideoTrackSelectedChange).not.toHaveBeenCalled();
  });

  it('should update internal state without notifying host via _setSelectedInternal', () => {
    const host = { handleVideoTrackSelectedChange: vi.fn() };
    const track = new HeliosVideoTrack('v1', 'main', 'Main Video', 'en', true, host);

    track._setSelectedInternal(false);
    expect(track.selected).toBe(false);
    expect(host.handleVideoTrackSelectedChange).not.toHaveBeenCalled();
  });
});

describe('HeliosVideoTrackList', () => {
  it('should manage tracks correctly', () => {
    const list = new HeliosVideoTrackList();
    const host = { handleVideoTrackSelectedChange: vi.fn() };
    const track = new HeliosVideoTrack('v1', 'main', 'Main Video', 'en', true, host);

    list.addTrack(track);
    expect(list.length).toBe(1);
    expect(list[0]).toBe(track);
    expect(list.getTrackById('v1')).toBe(track);

    list.removeTrack(track);
    expect(list.length).toBe(0);
    expect(list.getTrackById('v1')).toBeNull();
  });

  it('should provide array-like access', () => {
    const list = new HeliosVideoTrackList();
    const host = { handleVideoTrackSelectedChange: vi.fn() };
    const track1 = new HeliosVideoTrack('v1', 'main', 'Main Video', 'en', true, host);
    const track2 = new HeliosVideoTrack('v2', 'sign', 'Sign Language', 'en', false, host);

    list.addTrack(track1);
    list.addTrack(track2);

    expect(list[0]).toBe(track1);
    expect(list[1]).toBe(track2);

    let count = 0;
    for (const t of list) {
        count++;
    }
    expect(count).toBe(2);
  });

  it('should dispatch events', () => {
    const list = new HeliosVideoTrackList();
    const host = { handleVideoTrackSelectedChange: vi.fn() };
    const track = new HeliosVideoTrack('v1', 'main', 'Main Video', 'en', true, host);

    const addHandler = vi.fn();
    const removeHandler = vi.fn();
    const changeHandler = vi.fn();

    list.addEventListener('addtrack', addHandler);
    list.addEventListener('removetrack', removeHandler);
    list.addEventListener('change', changeHandler);

    list.addTrack(track);
    expect(addHandler).toHaveBeenCalled();
    expect((addHandler.mock.calls[0][0] as any).track).toBe(track);

    list.dispatchChangeEvent();
    expect(changeHandler).toHaveBeenCalled();

    list.removeTrack(track);
    expect(removeHandler).toHaveBeenCalled();
    expect((removeHandler.mock.calls[0][0] as any).track).toBe(track);
  });

  it('should calculate selectedIndex', () => {
    const list = new HeliosVideoTrackList();
    const host = { handleVideoTrackSelectedChange: vi.fn() };

    const track1 = new HeliosVideoTrack('v1', 'main', 'Main Video', 'en', false, host);
    const track2 = new HeliosVideoTrack('v2', 'sign', 'Sign Language', 'en', true, host);
    const track3 = new HeliosVideoTrack('v3', 'alt', 'Alternative', 'en', false, host);

    list.addTrack(track1);
    list.addTrack(track2);
    list.addTrack(track3);

    expect(list.selectedIndex).toBe(1);

    track2.selected = false;
    expect(list.selectedIndex).toBe(-1);

    track1.selected = true;
    expect(list.selectedIndex).toBe(0);
  });

  it('should support on* event handler properties', () => {
      const list = new HeliosVideoTrackList();
      const handler = vi.fn();

      list.onaddtrack = handler;
      const host = { handleVideoTrackSelectedChange: vi.fn() };
      const track = new HeliosVideoTrack('v1', 'main', 'Main Video', 'en', true, host);

      list.addTrack(track);
      expect(handler).toHaveBeenCalled();
  });
});
