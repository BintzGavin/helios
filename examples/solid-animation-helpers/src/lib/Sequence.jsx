import { createMemo, useContext, Show } from 'solid-js';
import { FrameContext } from './FrameContext';

export const Sequence = (props) => {
  const parentFrame = useContext(FrameContext); // accessor function

  // Resolve current frame: use parent context if available, otherwise fallback to props.frame()
  // Note: props.frame should be a signal accessor passed from App if it's the root
  const currentFrame = () => parentFrame ? parentFrame() : (props.frame ? props.frame() : 0);

  const state = createMemo(() => {
    const f = currentFrame();
    const from = props.from || 0;
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
