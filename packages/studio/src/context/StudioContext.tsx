import React, { createContext, useContext, useState } from 'react';

export interface Composition {
  id: string;
  name: string;
  url: string;
  description?: string;
}

interface StudioContextType {
  compositions: Composition[];
  activeComposition: Composition | null;
  setActiveComposition: (comp: Composition) => void;
  isSwitcherOpen: boolean;
  setSwitcherOpen: (isOpen: boolean) => void;
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

export const StudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [compositions] = useState<Composition[]>(MOCK_COMPOSITIONS);
  const [activeComposition, setActiveComposition] = useState<Composition | null>(MOCK_COMPOSITIONS[0]);
  const [isSwitcherOpen, setSwitcherOpen] = useState(false);

  return (
    <StudioContext.Provider
      value={{
        compositions,
        activeComposition,
        setActiveComposition,
        isSwitcherOpen,
        setSwitcherOpen
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
