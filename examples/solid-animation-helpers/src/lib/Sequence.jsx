import { createMemo, useContext, Show } from 'solid-js';
import { FrameContext } from './FrameContext';
import { SeriesContext } from './SeriesContext';

export const Sequence = (props) => {
  const parentFrame = useContext(FrameContext); // accessor function
  const series = useContext(SeriesContext);

  let seriesOffset = 0;

  // Register with parent Series if available
  // Since Solid executes component bodies synchronously during creation, this works.
  if (series) {
    seriesOffset = series.register(props.durationInFrames || 0);
  }

  // Resolve current frame: use parent context if available, otherwise fallback to props.frame()
  // Note: props.frame should be a signal accessor passed from App if it's the root
  const currentFrame = () => {
    if (parentFrame) return parentFrame();
    if (props.frame) {
      const val = props.frame();
      // Handle if props.frame returns a HeliosState object (which has currentFrame property)
      // or just a number (if simplified)
      return typeof val === 'object' && val !== null && 'currentFrame' in val ? val.currentFrame : val;
    }
    return 0;
  };

  const state = createMemo(() => {
    const f = currentFrame();
    // Add seriesOffset to the explicitly provided 'from' prop (default 0)
    const from = (props.from || 0) + seriesOffset;
    const duration = props.durationInFrames;

    const rel = f - from;
    const isActive = rel >= 0 && (duration === undefined || rel < duration);

    return { rel, isActive };
  });

  return (
    <Show when={state().isActive}>
      <FrameContext.Provider value={() => state().rel}>
        {props.children}
      </FrameContext.Provider>
    </Show>
  );
};
