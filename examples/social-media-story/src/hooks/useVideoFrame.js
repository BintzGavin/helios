import { useContext } from 'react';
import { FrameContext } from '../context/FrameContext';

export function useVideoFrame() {
  return useContext(FrameContext);
}
