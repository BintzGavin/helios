import React, { createContext, useContext, useState, useEffect } from 'react';
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

export interface RenderConfig {
  mode: 'canvas' | 'dom';
  videoBitrate?: string;
  videoCodec?: string;
}

export interface RenderJob {
  id: string;
  status: 'queued' | 'rendering' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-1
  compositionId: string;
  outputPath?: string;
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
  volume: number;
  muted: boolean;
  inputProps: Record<string, any>;
}

const DEFAULT_PLAYER_STATE: PlayerState = {
  currentFrame: 0,
  duration: 0,
  fps: 30,
  playbackRate: 1,
  isPlaying: false,
  volume: 1,
  muted: false,
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
  uploadAsset: (file: File) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;

  // Render Jobs
  renderJobs: RenderJob[];
  startRender: (compositionId: string, options?: { inPoint: number; outPoint: number }) => void;
  cancelRender: (jobId: string) => void;
  deleteRender: (jobId: string) => void;

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

  // Canvas
  canvasSize: { width: number; height: number };
  setCanvasSize: (size: { width: number; height: number }) => void;

  // Render Config
  renderConfig: RenderConfig;
  setRenderConfig: (config: RenderConfig) => void;
}

const StudioContext = createContext<StudioContextType | undefined>(undefined);

export const StudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [compositions, setCompositions] = useState<Composition[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeComposition, setActiveComposition] = useState<Composition | null>(null);
  const [isSwitcherOpen, setSwitcherOpen] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 1920, height: 1080 });
  const [renderConfig, setRenderConfig] = useState<RenderConfig>({ mode: 'canvas' });

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

  const fetchAssets = () => {
    fetch('/api/assets')
      .then(res => res.json())
      .then((data: Asset[]) => {
        setAssets(data);
      })
      .catch(err => {
        console.error('Failed to fetch assets:', err);
      });
  };

  const uploadAsset = async (file: File) => {
    try {
      await fetch('/api/assets/upload', {
        method: 'POST',
        headers: {
          'x-filename': file.name
        },
        body: file
      });
      fetchAssets();
    } catch (e) {
      console.error('Failed to upload asset:', e);
    }
  };

  const deleteAsset = async (id: string) => {
    try {
      await fetch(`/api/assets?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      fetchAssets();
    } catch (e) {
      console.error('Failed to delete asset:', e);
    }
  };

  // Fetch compositions and assets from backend
  useEffect(() => {
    fetch('/api/compositions')
      .then(res => res.json())
      .then((data: Composition[]) => {
        setCompositions(data);
        if (data.length > 0 && !activeComposition) {
          setActiveComposition(data[0]);
        }
      })
      .catch(err => {
        console.error('Failed to fetch compositions:', err);
      });

    fetchAssets();
  }, []);

  // Reset range when composition changes
  useEffect(() => {
    setInPoint(0);
    setOutPoint(0);
  }, [activeComposition?.id]);

  // Initialize outPoint when duration becomes available
  useEffect(() => {
    const { duration, fps } = playerState;
    if (duration > 0 && outPoint === 0) {
      setOutPoint(Math.floor(duration * fps));
    }
  }, [playerState.duration, playerState.fps, outPoint]);

  const fetchJobs = () => {
    fetch('/api/jobs')
      .then(res => res.json())
      .then((data: RenderJob[]) => setRenderJobs(data))
      .catch(console.error);
  };

  // Poll for jobs
  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 1000);
    return () => clearInterval(interval);
  }, []);

  const startRender = async (compositionId: string, options?: { inPoint: number; outPoint: number }) => {
    const comp = compositions.find(c => c.id === compositionId);
    if (!comp) return;

    const { fps, duration } = playerState;

    try {
      await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compositionUrl: comp.url,
          fps,
          duration,
          width: canvasSize.width,
          height: canvasSize.height,
          inPoint: options?.inPoint,
          outPoint: options?.outPoint,
          inputProps: playerState.inputProps,
          ...renderConfig
        })
      });
      fetchJobs();
    } catch (err) {
      console.error('Failed to start render:', err);
    }
  };

  const cancelRender = async (jobId: string) => {
    try {
      await fetch(`/api/jobs/${jobId}/cancel`, { method: 'POST' });
      fetchJobs();
    } catch (err) {
      console.error('Failed to cancel render:', err);
    }
  };

  const deleteRender = async (jobId: string) => {
    try {
      await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
      fetchJobs();
    } catch (err) {
      console.error('Failed to delete render:', err);
    }
  };

  const [controller, setController] = useState<HeliosController | null>(null);
  const [loop, setLoop] = useState(false);

  const toggleLoop = () => setLoop(prev => !prev);

  return (
    <StudioContext.Provider
      value={{
        compositions,
        assets,
        uploadAsset,
        deleteAsset,
        activeComposition,
        setActiveComposition,
        isSwitcherOpen,
        setSwitcherOpen,
        renderJobs,
        startRender,
        cancelRender,
        deleteRender,
        inPoint,
        setInPoint,
        outPoint,
        setOutPoint,
        controller,
        setController,
        playerState,
        setPlayerState,
        loop,
        toggleLoop,
        canvasSize,
        setCanvasSize,
        renderConfig,
        setRenderConfig
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
