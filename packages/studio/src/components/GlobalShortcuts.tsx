import React from 'react';
import { useStudio } from '../context/StudioContext';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';

export const GlobalShortcuts: React.FC = () => {
  const {
    controller,
    playerState,
    setHelpOpen,
    setOmnibarOpen,
    inPoint,
    setInPoint,
    outPoint,
    setOutPoint,
    toggleLoop
  } = useStudio();

  const { currentFrame, duration, fps } = playerState;
  const totalFrames = duration * fps || 100;

  // Space: Play/Pause
  useKeyboardShortcut(' ', () => {
    if (!controller) return;
    if (playerState.isPlaying) {
      controller.pause();
    } else {
      controller.play();
    }
  }, { ignoreInput: true, preventDefault: true });

  // ArrowLeft: Seek Backward
  useKeyboardShortcut('ArrowLeft', (e) => {
    if (!controller) return;
    const amount = e.shiftKey ? 10 : 1;
    controller.seek(Math.max(0, playerState.currentFrame - amount));
  }, { ignoreInput: true, preventDefault: true });

  // ArrowRight: Seek Forward
  useKeyboardShortcut('ArrowRight', (e) => {
    if (!controller) return;
    const amount = e.shiftKey ? 10 : 1;
    controller.seek(playerState.currentFrame + amount);
  }, { ignoreInput: true, preventDefault: true });

  // Home: Rewind
  useKeyboardShortcut('Home', () => {
    if (!controller) return;
    controller.seek(inPoint);
  }, { ignoreInput: true, preventDefault: true });

  // ?: Help
  useKeyboardShortcut('?', (e) => {
    e.preventDefault();
    setHelpOpen(true);
  }, { ignoreInput: true });

  // Cmd+K: Omnibar
  useKeyboardShortcut('k', (e) => {
    e.preventDefault();
    setOmnibarOpen(true);
  }, { ctrlOrCmd: true });

  // I: Set In Point
  useKeyboardShortcut('i', () => {
    const newIn = Math.max(0, Math.min(Math.round(currentFrame), outPoint - 1));
    setInPoint(newIn);
  }, { ignoreInput: true });

  // O: Set Out Point
  useKeyboardShortcut('o', () => {
    const newOut = Math.max(inPoint + 1, Math.min(Math.round(currentFrame), totalFrames));
    setOutPoint(newOut);
  }, { ignoreInput: true });

  // J: Play Reverse / Speed Up Reverse
  useKeyboardShortcut('j', () => {
    if (!controller) return;
    const currentRate = playerState.playbackRate || 1;
    if (!playerState.isPlaying || currentRate > -0.25) {
      controller.setPlaybackRate(-1);
      controller.play();
    } else {
      const newRate = Math.max(-4, currentRate === -0.25 ? -0.5 : (currentRate === -0.5 ? -1 : currentRate * 2));
      controller.setPlaybackRate(newRate);
      if (!playerState.isPlaying) controller.play();
    }
  }, { ignoreInput: true });

  // K: Pause
  useKeyboardShortcut('k', () => {
    if (!controller) return;
    controller.pause();
  }, { ignoreInput: true });

  // L: Play Forward / Speed Up, Shift+L: Toggle Loop
  useKeyboardShortcut('l', (e) => {
    if (e.shiftKey) {
      toggleLoop();
      return;
    }

    if (!controller) return;
    const currentRate = playerState.playbackRate || 1;
    if (!playerState.isPlaying || currentRate < 0.25) {
      controller.setPlaybackRate(1);
      controller.play();
    } else {
      const newRate = Math.min(4, currentRate === 0.25 ? 0.5 : (currentRate === 0.5 ? 1 : currentRate * 2));
      controller.setPlaybackRate(newRate);
      if (!playerState.isPlaying) controller.play();
    }
  }, { ignoreInput: true });

  return null;
};
