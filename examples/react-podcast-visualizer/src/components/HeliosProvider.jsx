import React, { createContext, useEffect, useState, useRef } from 'react';
import { Helios } from '@helios-project/core';

export const HeliosContext = createContext(null);

export function HeliosProvider({ children, config }) {
  const [heliosInstance, setHeliosInstance] = useState(null);
  const [frameState, setFrameState] = useState({ frame: 0, fps: 30, duration: 0 });
  const heliosRef = useRef(null);

  useEffect(() => {
    // Initialize Helios
    const helios = new Helios({
      fps: 30,
      duration: 5,
      autoSyncAnimations: true, // Important for sync
      ...config
    });

    heliosRef.current = helios;

    // Expose for debugging/renderer
    window.helios = helios;

    // Bind to document timeline for Renderer compatibility
    helios.bindToDocumentTimeline();

    // Subscribe to updates
    const unsubscribe = helios.subscribe((state) => {
      setFrameState({
        frame: state.currentFrame,
        fps: state.fps,
        duration: state.duration
      });
    });

    setHeliosInstance(helios);

    return () => {
      unsubscribe();
      // Optional: Clean up if needed, though usually Helios instances persist for the life of the page
    };
  }, []); // Run once on mount

  if (!heliosInstance) {
    return <div>Initializing Helios...</div>;
  }

  return (
    <HeliosContext.Provider value={{ helios: heliosInstance, ...frameState }}>
      {children}
    </HeliosContext.Provider>
  );
}
