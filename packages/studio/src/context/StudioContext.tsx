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

export interface PlayerState {
  currentFrame: number;
  duration: number;
  fps: number;
  isPlaying: boolean;
  inputProps: Record<string, any>;
}

const DEFAULT_PLAYER_STATE: PlayerState = {
  currentFrame: 0,
  duration: 0,
  fps: 30,
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

  // Player Control
  controller: HeliosController | null;
  setController: (controller: HeliosController | null) => void;
  playerState: PlayerState;
  setPlayerState: (state: PlayerState) => void;

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
    url: 'http://localhost:5173/examples/simple-canvas-animation/index.html',
    description: 'Basic vanilla JS canvas animation'
  },
  {
    id: 'react-canvas',
    name: 'React Composition',
    url: 'http://localhost:5173/examples/react-canvas-animation/index.html',
    description: 'Canvas animation using React'
  },
  {
    id: 'svelte-canvas',
    name: 'Svelte Composition',
    url: 'http://localhost:5173/examples/svelte-canvas-animation/index.html',
    description: 'Canvas animation using Svelte'
  },
  {
    id: 'threejs',
    name: 'Three.js Cube',
    url: 'http://localhost:5173/examples/threejs-canvas-animation/index.html',
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

  const [controller, setController] = useState<HeliosController | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>(DEFAULT_PLAYER_STATE);
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
