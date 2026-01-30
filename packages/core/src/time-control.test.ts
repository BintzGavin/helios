import { describe, it, expect } from 'vitest';
import { Helios } from './index';

describe('Helios Time Control', () => {
  it('should initialize currentTime to 0', () => {
    const helios = new Helios({
      width: 1920,
      height: 1080,
      fps: 30,
      duration: 10,
    });

    expect(helios.currentTime.value).toBe(0);
    expect(helios.getState().currentTime).toBe(0);
  });

  it('should initialize currentTime based on initialFrame', () => {
    const helios = new Helios({
      width: 1920,
      height: 1080,
      fps: 30,
      duration: 10,
      initialFrame: 30,
    });

    expect(helios.currentTime.value).toBe(1); // 30 frames / 30 fps = 1 second
    expect(helios.getState().currentTime).toBe(1);
  });

  it('should update currentFrame and currentTime when seeking to time', () => {
    const helios = new Helios({
      width: 1920,
      height: 1080,
      fps: 30,
      duration: 10,
    });

    helios.seekToTime(1.5);

    expect(helios.currentFrame.value).toBe(45); // 1.5 * 30
    expect(helios.currentTime.value).toBe(1.5);
    expect(helios.getState().currentTime).toBe(1.5);
  });

  it('should update currentTime when seeking by frame', () => {
    const helios = new Helios({
      width: 1920,
      height: 1080,
      fps: 30,
      duration: 10,
    });

    helios.seek(60);

    expect(helios.currentFrame.value).toBe(60);
    expect(helios.currentTime.value).toBe(2); // 60 / 30
  });

  it('should clamp seekToTime to duration', () => {
    const helios = new Helios({
      width: 1920,
      height: 1080,
      fps: 30,
      duration: 10,
    });

    helios.seekToTime(11);

    expect(helios.currentTime.value).toBe(10);
    expect(helios.currentFrame.value).toBe(300);
  });

  it('should clamp seekToTime to 0 if negative', () => {
    const helios = new Helios({
      width: 1920,
      height: 1080,
      fps: 30,
      duration: 10,
    });

    helios.seekToTime(-1);

    expect(helios.currentTime.value).toBe(0);
    expect(helios.currentFrame.value).toBe(0);
  });

  it('should preserve currentTime when changing FPS', () => {
    const helios = new Helios({
      width: 1920,
      height: 1080,
      fps: 30,
      duration: 10,
    });

    helios.seekToTime(2); // 2 seconds, frame 60
    expect(helios.currentFrame.value).toBe(60);
    expect(helios.currentTime.value).toBe(2);

    helios.setFps(60);

    expect(helios.currentTime.value).toBe(2);
    expect(helios.currentFrame.value).toBe(120); // 2 seconds * 60 fps
  });
});
