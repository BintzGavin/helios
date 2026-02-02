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

  // L: Toggle Loop
  useKeyboardShortcut('l', () => {
    toggleLoop();
  }, { ignoreInput: true });

  return null;
};
