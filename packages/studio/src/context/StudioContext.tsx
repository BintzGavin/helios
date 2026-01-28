import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { type HeliosController, ClientSideExporter } from '@helios-project/player';
import type { HeliosSchema, CaptionCue } from '@helios-project/core';

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
  type: 'image' | 'video' | 'audio' | 'font' | 'model' | 'json' | 'shader' | 'other';
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
  schema?: HeliosSchema;
  captions: CaptionCue[];
}

const DEFAULT_PLAYER_STATE: PlayerState = {
  currentFrame: 0,
  duration: 0,
  fps: 30,
  playbackRate: 1,
  isPlaying: false,
  volume: 1,
  muted: false,
  inputProps: {},
  schema: undefined,
  captions: []
};

interface StudioContextType {
  compositions: Composition[];
  activeComposition: Composition | null;
  setActiveComposition: (comp: Composition) => void;
  isSwitcherOpen: boolean;
  setSwitcherOpen: (isOpen: boolean) => void;

  isHelpOpen: boolean;
  setHelpOpen: (isOpen: boolean) => void;

  isDiagnosticsOpen: boolean;
  setDiagnosticsOpen: (isOpen: boolean) => void;

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

  // Snapshot
  takeSnapshot: () => Promise<void>;

  // Client-Side Export
  isExporting: boolean;
  exportProgress: number;
  exportVideo: (format: 'mp4' | 'webm') => Promise<void>;
  cancelExport: () => void;
}

const StudioContext = createContext<StudioContextType | undefined>(undefined);

export const StudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [compositions, setCompositions] = useState<Composition[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeComposition, setActiveComposition] = useState<Composition | null>(null);
  const [isSwitcherOpen, setSwitcherOpen] = useState(false);
  const [isHelpOpen, setHelpOpen] = useState(false);
  const [isDiagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 1920, height: 1080 });
  const [renderConfig, setRenderConfig] = useState<RenderConfig>({ mode: 'canvas' });

  const [renderJobs, setRenderJobs] = useState<RenderJob[]>([]);

  // Client-Side Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const exportAbortControllerRef = useRef<AbortController | null>(null);

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

  const takeSnapshot = async () => {
    if (!controller) return;

    const frameNumber = playerState.currentFrame;
    const mode = renderConfig.mode;

    try {
      const result = await controller.captureFrame(frameNumber, { mode });
      if (!result || !result.frame) return;

      const { frame: videoFrame } = result;

      const canvas = document.createElement('canvas');
      canvas.width = videoFrame.displayWidth;
      canvas.height = videoFrame.displayHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(videoFrame, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');

        const compName = activeComposition?.name || 'composition';
        const filename = `snapshot-${compName}-${frameNumber}.png`;

        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        a.click();
      }

      videoFrame.close();
    } catch (e) {
      console.error("Snapshot failed", e);
    }
  };

  const exportVideo = async (format: 'mp4' | 'webm') => {
    if (!controller) return;

    // Reset state
    setIsExporting(true);
    setExportProgress(0);

    // Create new abort controller
    exportAbortControllerRef.current = new AbortController();

    // Instantiate exporter with dummy iframe (unused in export method)
    // Note: We cast to unknown then HTMLIFrameElement to satisfy type requirements
    const dummyIframe = document.createElement('iframe');
    const exporter = new ClientSideExporter(controller, dummyIframe);

    try {
      await exporter.export({
        format,
        mode: renderConfig.mode === 'dom' ? 'dom' : 'canvas',
        onProgress: (p: number) => setExportProgress(p),
        signal: exportAbortControllerRef.current.signal,
        includeCaptions: true // Or expose as option if needed
      });
    } catch (e: any) {
      if (e.message !== "Export aborted") {
        console.error("Export failed:", e);
        // We could expose an error state here if desired
      }
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      exportAbortControllerRef.current = null;
    }
  };

  const cancelExport = () => {
    if (exportAbortControllerRef.current) {
      exportAbortControllerRef.current.abort();
    }
  };

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
        isHelpOpen,
        setHelpOpen,
        isDiagnosticsOpen,
        setDiagnosticsOpen,
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
        setRenderConfig,
        takeSnapshot,
        isExporting,
        exportProgress,
        exportVideo,
        cancelExport
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
