import React, { createContext, useContext } from 'react';

const FrameContext = createContext({ frame: 0, from: 0 });

export const Sequence = ({ from, duration, children, currentFrame, fps = 30 }) => {
  // Only render if within the time window
  if (currentFrame >= from && currentFrame < from + duration) {
    const startTime = from / fps;
    return (
      <FrameContext.Provider value={{ frame: currentFrame, from }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          '--sequence-start': `${startTime}s`
        }}>
          {children}
        </div>
      </FrameContext.Provider>
    );
  }
  return null;
};

export const useSequence = () => useContext(FrameContext);
