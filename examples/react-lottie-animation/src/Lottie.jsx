import React, { useRef, useEffect } from 'react';
import lottie from 'lottie-web';
import { useVideoFrame } from './hooks/useVideoFrame';

export function Lottie({ animationData, helios }) {
  const containerRef = useRef(null);
  const animRef = useRef(null);
  const frame = useVideoFrame(helios);

  // Initialize Lottie
  useEffect(() => {
    if (!containerRef.current) return;

    const anim = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData: animationData,
    });

    animRef.current = anim;

    return () => {
      anim.destroy();
    };
  }, [animationData]);

  // Sync with frame
  useEffect(() => {
    if (!animRef.current) return;

    const h = helios || window.helios;
    const fps = h ? h.fps : 30;

    const timeMs = (frame / fps) * 1000;
    animRef.current.goToAndStop(timeMs, false);

  }, [frame, helios]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
