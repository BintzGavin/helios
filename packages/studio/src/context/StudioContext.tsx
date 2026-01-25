import React, { createContext, useContext, useState } from 'react';
import type { HeliosController } from '@helios-project/player';

export interface Composition {
  id: string;
  name: string;
  url: string;
  description?: string;
}

export interface Asset {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'font' | 'other';
}

export interface RenderJob {
  id: string;
  status: 'queued' | 'rendering' | 'completed' | 'failed';
  progress: number; // 0-1
  compositionId: string;
  outputUrl?: string;
  error?: string;
  createdAt: number;
  inPoint?: number;
  outPoint?: number;
}

export interface PlayerState {
  currentFrame: number;
  duration: number;
  fps: number;
  playbackRate: number;
  isPlaying: boolean;
  inputProps: Record<string, any>;
}

const DEFAULT_PLAYER_STATE: PlayerState = {
  currentFrame: 0,
  duration: 0,
  fps: 30,
  playbackRate: 1,
  isPlaying: false,
  inputProps: {}
};

interface StudioContextType {
  compositions: Composition[];
  activeComposition: Composition | null;
  setActiveComposition: (comp: Composition) => void;
  isSwitcherOpen: boolean;
  setSwitcherOpen: (isOpen: boolean) => void;

  // Assets
  assets: Asset[];

  // Render Jobs
  renderJobs: RenderJob[];
  startRender: (compositionId: string, options?: { inPoint: number; outPoint: number }) => void;

  // Timeline Range
  inPoint: number;
  setInPoint: (val: number) => void;
  outPoint: number;
  setOutPoint: (val: number) => void;

  // Player Control
  controller: HeliosController | null;
  setController: (controller: HeliosController | null) => void;
  playerState: PlayerState;
  setPlayerState: (state: Partial<PlayerState> | ((prev: PlayerState) => PlayerState)) => void;

  // Studio UI State
  loop: boolean;
  toggleLoop: () => void;
}

const StudioContext = createContext<StudioContextType | undefined>(undefined);

// Mock data representing what the CLI/Project Discovery would provide
const MOCK_COMPOSITIONS: Composition[] = [
  {
    id: 'simple-canvas',
    name: 'Simple Canvas Animation',
    url: 'http://localhost:5173/examples/simple-canvas-animation/composition.html',
    description: 'Basic vanilla JS canvas animation'
  },
  {
    id: 'react-canvas',
    name: 'React Composition',
    url: 'http://localhost:5173/examples/react-canvas-animation/composition.html',
    description: 'Canvas animation using React'
  },
  {
    id: 'svelte-canvas',
    name: 'Svelte Composition',
    url: 'http://localhost:5173/examples/svelte-canvas-animation/composition.html',
    description: 'Canvas animation using Svelte'
  },
  {
    id: 'threejs',
    name: 'Three.js Cube',
    url: 'http://localhost:5173/examples/threejs-canvas-animation/composition.html',
    description: '3D cube using Three.js'
  }
];

const MOCK_ASSETS: Asset[] = [
  {
    id: '1',
    name: 'logo.png',
    url: 'https://via.placeholder.com/150/0000FF/808080?text=Logo',
    type: 'image'
  },
  {
    id: '2',
    name: 'background.jpg',
    url: 'https://via.placeholder.com/300/FF0000/FFFFFF?text=Background',
    type: 'image'
  },
  {
    id: '3',
    name: 'music.mp3',
    url: '#',
    type: 'audio'
  }
];

export const StudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [compositions] = useState<Composition[]>(MOCK_COMPOSITIONS);
  const [assets] = useState<Asset[]>(MOCK_ASSETS);
  const [activeComposition, setActiveComposition] = useState<Composition | null>(MOCK_COMPOSITIONS[0]);
  const [isSwitcherOpen, setSwitcherOpen] = useState(false);

  const [renderJobs, setRenderJobs] = useState<RenderJob[]>([]);

  const [inPoint, setInPoint] = useState(0);
  const [outPoint, setOutPoint] = useState(0);
  const [playerState, _setPlayerState] = useState<PlayerState>(DEFAULT_PLAYER_STATE);

  const setPlayerState = (newState: Partial<PlayerState> | ((prev: PlayerState) => PlayerState)) => {
    _setPlayerState(prev => {
      const state = typeof newState === 'function' ? newState(prev) : newState;
      return {
        ...prev,
        ...state,
        playbackRate: state.playbackRate ?? prev.playbackRate ?? 1
      };
    });
  };

  // Reset range when composition changes
  React.useEffect(() => {
    setInPoint(0);
    setOutPoint(0);
  }, [activeComposition?.id]);

  // Initialize outPoint when duration becomes available
  React.useEffect(() => {
    const { duration, fps } = playerState;
    if (duration > 0 && outPoint === 0) {
      setOutPoint(Math.floor(duration * fps));
    }
  }, [playerState.duration, playerState.fps, outPoint]);

  const startRender = (compositionId: string, options?: { inPoint: number; outPoint: number }) => {
    const newJob: RenderJob = {
      id: Date.now().toString(),
      status: 'queued',
      progress: 0,
      compositionId,
      createdAt: Date.now(),
      inPoint: options?.inPoint,
      outPoint: options?.outPoint
    };
    setRenderJobs(prev => [newJob, ...prev]);

    // Mock simulation
    setTimeout(() => {
      setRenderJobs(prev => prev.map(j => j.id === newJob.id ? { ...j, status: 'rendering' } : j));

      let progress = 0;
      const interval = setInterval(() => {
        progress += 0.1;
        setRenderJobs(prev => prev.map(j => j.id === newJob.id ? { ...j, progress: Math.min(progress, 1) } : j));

        if (progress >= 1) {
          clearInterval(interval);
          setRenderJobs(prev => prev.map(j => j.id === newJob.id ? { ...j, status: 'completed', progress: 1 } : j));
        }
      }, 500);
    }, 1000);
  };

  const [controller, setController] = useState<HeliosController | null>(null);
  const [loop, setLoop] = useState(false);

  const toggleLoop = () => setLoop(prev => !prev);

  return (
    <StudioContext.Provider
      value={{
        compositions,
        assets,
        activeComposition,
        setActiveComposition,
        isSwitcherOpen,
        setSwitcherOpen,
        renderJobs,
        startRender,
        inPoint,
        setInPoint,
        outPoint,
        setOutPoint,
        controller,
        setController,
        playerState,
        setPlayerState,
        loop,
        toggleLoop
      }}
    >
      {children}
    </StudioContext.Provider>
  );
};

export const useStudio = () => {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error('useStudio must be used within a StudioProvider');
  }
  return context;
};
