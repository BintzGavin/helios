import { useContext } from 'react';
import { sequence } from '../../../../packages/core/dist/index.js';
import { FrameContext } from './FrameContext';

export const Sequence = ({ from, durationInFrames, children }) => {
  const parentFrame = useContext(FrameContext);
  const { isActive, relativeFrame } = sequence({ frame: parentFrame, from, durationInFrames });

  if (!isActive) return null;

  return (
    <FrameContext.Provider value={relativeFrame}>
      {children}
    </FrameContext.Provider>
  );
};
