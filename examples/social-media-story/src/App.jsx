import React, { useState, useEffect } from 'react';
import { Helios, spring, interpolate } from '../../../packages/core/src/index.ts';
import { FrameContext } from './context/FrameContext';
import { useVideoFrame } from './hooks/useVideoFrame';
import { StorySequence } from './components/StorySequence';
import { VIDEO_SRC } from './assets/media';

// --- Helios Setup ---
// 9:16 Aspect Ratio (1080x1920) for Social Media
// Duration: 10 seconds
const helios = new Helios({
  duration: 10,
  fps: 30,
  width: 1080,
  height: 1920,
  autoSyncAnimations: true // Syncs <video> elements
});

helios.bindToDocumentTimeline();

if (typeof window !== 'undefined') {
  window.helios = helios;
}

// --- Components ---

const ProgressBar = () => {
  const frame = useVideoFrame();
  const progress = interpolate(frame, [0, helios.duration * helios.fps], [0, 100]);

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: `${progress}%`,
      height: '20px',
      backgroundColor: '#ff4757',
      zIndex: 100
    }} />
  );
};

const TitleCard = () => {
  const frame = useVideoFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  const scale = spring({ frame, fps: 30, from: 0.5, to: 1, config: { stiffness: 100 } });

  return (
    <div style={{
      position: 'absolute',
      top: '20%',
      left: '10%',
      right: '10%',
      padding: '60px',
      backgroundColor: 'rgba(255,255,255,0.9)',
      color: '#2f3542',
      borderRadius: '40px',
      textAlign: 'center',
      opacity,
      transform: `scale(${scale})`,
      boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
    }}>
      <h1 style={{ fontSize: '100px', margin: 0, lineHeight: 1.2 }}>Summer<br/>Vibes ☀️</h1>
      <p style={{ fontSize: '40px', margin: '40px 0 0', color: '#57606f' }}>The 2024 Compilation</p>
    </div>
  );
};

const FeatureItem = ({ title }) => {
  return (
      <div style={{
          marginTop: '40px',
          padding: '40px',
          background: 'rgba(255,255,255,0.95)',
          color: '#2f3542',
          borderRadius: '30px',
          fontSize: '50px',
          fontWeight: 'bold',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '20px'
      }}>
          {title}
      </div>
  );
};

// --- App ---

export default function App() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    return helios.subscribe((state) => setFrame(state.currentFrame));
  }, []);

  return (
    <FrameContext.Provider value={frame}>
      <div style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#000',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}>
        {/* Layer 1: Background Video */}
        {/* autoSyncAnimations: true handles the play/pause/seek of this video */}
        <video
          src={VIDEO_SRC}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.8
          }}
          loop
          muted
          playsInline
        />

        {/* Layer 2: Overlay Content */}
        <ProgressBar />

        {/* Scene 1: Intro (0 - 2s) */}
        <StorySequence from={0} durationInFrames={60}>
            <TitleCard />
        </StorySequence>

        {/* Scene 2: List (2s - 6s) */}
        <StorySequence from={60} durationInFrames={120}>
            <div style={{
                position: 'absolute',
                bottom: '15%',
                left: '10%',
                right: '10%',
                display: 'flex',
                flexDirection: 'column',
                gap: '30px'
            }}>
                 <div style={{
                     transform: `translateX(${interpolate(frame, [60, 80], [-100, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}%)`,
                     opacity: interpolate(frame, [60, 70], [0, 1])
                 }}>
                    <FeatureItem title="1. Beach Days 🏖️" />
                 </div>

                 <div style={{
                     transform: `translateX(${interpolate(frame, [80, 100], [-100, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}%)`,
                     opacity: interpolate(frame, [80, 90], [0, 1])
                 }}>
                    <FeatureItem title="2. Road Trips 🚗" />
                 </div>

                 <div style={{
                     transform: `translateX(${interpolate(frame, [100, 120], [-100, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}%)`,
                     opacity: interpolate(frame, [100, 110], [0, 1])
                 }}>
                    <FeatureItem title="3. Sunsets 🌅" />
                 </div>
            </div>
        </StorySequence>

        {/* Scene 3: Outro (6s - 10s) */}
        <StorySequence from={180} durationInFrames={120}>
             <div style={{
                 position: 'absolute',
                 top: '50%',
                 left: '50%',
                 transform: 'translate(-50%, -50%)',
                 textAlign: 'center'
             }}>
                 <div style={{
                     fontSize: '80px',
                     color: 'white',
                     fontWeight: 'bold',
                     textShadow: '0 4px 20px rgba(0,0,0,0.5)',
                     opacity: interpolate(frame, [180, 200], [0, 1]),
                     transform: `scale(${spring({ frame, fps: 30, from: 0, to: 1, config: { stiffness: 80 } })})`
                 }}>
                     See you next year! 👋
                 </div>
             </div>
        </StorySequence>

      </div>
    </FrameContext.Provider>
  );
}
