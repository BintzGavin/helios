import { useEffect, useLayoutEffect, useRef } from 'react';
import lottie from 'lottie-web';
import { Helios } from '@helios-project/core';
import { useVideoFrame } from './hooks/useVideoFrame';
import animationData from './animation.json';

const helios = new Helios({
  duration: 2, // 2 seconds
  fps: 30
});

// Ensure we bind to the timeline for automated drivers (Renderer/Playwright)
helios.bindToDocumentTimeline();

export default function App() {
  const containerRef = useRef(null);
  const animRef = useRef(null);
  const frame = useVideoFrame(helios);

  useEffect(() => {
    if (containerRef.current) {
      animRef.current = lottie.loadAnimation({
        container: containerRef.current,
        animationData,
        autoplay: false,
        loop: false,
        renderer: 'svg' // or canvas
      });
    }

    return () => {
      if (animRef.current) {
        animRef.current.destroy();
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (animRef.current) {
      // Lottie uses milliseconds if second arg is false
      // helios.fps might be reactive or static, in core it's usually static on instance but reactive in state
      // Accessing it from instance is safe.
      const timeMs = (frame / helios.fps) * 1000;
      animRef.current.goToAndStop(timeMs, false);
    }
  }, [frame]);

  return (
    <div
      ref={containerRef}
      style={{
        width: 400,
        height: 400,
        backgroundColor: '#fff' // White background to see the animation clearly
      }}
    />
  );
}
