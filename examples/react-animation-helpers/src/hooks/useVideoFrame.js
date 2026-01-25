import { useContext } from 'react';
import { FrameContext } from '../components/FrameContext';

export function useVideoFrame() {
  return useContext(FrameContext);
}
