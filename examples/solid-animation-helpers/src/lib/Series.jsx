import { SeriesContext } from './SeriesContext';

export const Series = (props) => {
  // Mutable state for the setup phase.
  // Since Solid component functions run once, this persists for the instance.
  let accumulatedFrames = 0;

  const register = (duration) => {
    const currentOffset = accumulatedFrames;
    accumulatedFrames += duration;
    return currentOffset;
  };

  return (
    <SeriesContext.Provider value={{ register }}>
      {props.children}
    </SeriesContext.Provider>
  );
};
