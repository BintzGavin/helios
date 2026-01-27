import { useVideoFrame } from '../hooks/useVideoFrame';

export const StorySequence = ({ from, durationInFrames, children }) => {
  const frame = useVideoFrame();
  const end = from + durationInFrames;

  // Render only if within the time window
  if (frame >= from && frame < end) {
    return <>{children}</>;
  }
  return null;
};
