import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { type HeliosController, ClientSideExporter } from '@helios-project/player';
import type { HeliosSchema, CaptionCue, Marker, AudioTrackMetadata } from '@helios-project/core';
import { useToast } from './ToastContext';

export interface CompositionMetadata {
  width: number;
  height: number;
  fps: number;
  duration: number;
  defaultProps?: Record<string, any>;
}

export interface TemplateInfo {
  id: string;
  label: string;
}

export interface Composition {
  id: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
  description?: string;
  metadata?: CompositionMetadata;
}

export interface Asset {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'font' | 'model' | 'json' | 'shader' | 'folder' | 'other';
  relativePath: string;
}

export interface RenderConfig {
  mode: 'canvas' | 'dom';
  videoBitrate?: string;
  videoCodec?: string;
  concurrency?: number;
  hwAccel?: string;
  scale?: number;
  webCodecsPreference?: 'hardware' | 'software' | 'disabled';
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
  markers: Marker[];
  audioTracks: Record<string, { volume: number; muted: boolean }>;
  availableAudioTracks: AudioTrackMetadata[];
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
  captions: [],
  markers: [],
  audioTracks: {},
  availableAudioTracks: []
};

interface TimelineState {
  inPoint: number;
  outPoint: number;
  loop: boolean;
  frame: number;
}

interface StudioContextType {
  compositions: Composition[];
  activeComposition: Composition | null;
  setActiveComposition: (comp: Composition) => void;
  isOmnibarOpen: boolean;
  setOmnibarOpen: (isOpen: boolean) => void;

  isHelpOpen: boolean;
  setHelpOpen: (isOpen: boolean) => void;

  isDiagnosticsOpen: boolean;
  setDiagnosticsOpen: (isOpen: boolean) => void;

  isAssistantOpen: boolean;
  setAssistantOpen: (isOpen: boolean) => void;

  isCreateOpen: boolean;
  setCreateOpen: (isOpen: boolean) => void;
  isDuplicateOpen: boolean;
  setDuplicateOpen: (isOpen: boolean) => void;
  duplicateTargetId: string | null;
  setDuplicateTargetId: (id: string | null) => void;
  isSettingsOpen: boolean;
  setSettingsOpen: (isOpen: boolean) => void;
  createComposition: (name: string, template?: string, options?: CompositionMetadata) => Promise<void>;
  duplicateComposition: (sourceId: string, newName: string) => Promise<void>;
  updateCompositionMetadata: (id: string, metadata: CompositionMetadata, name?: string) => Promise<void>;
  updateThumbnail: (id: string) => Promise<void>;
  deleteComposition: (id: string) => Promise<void>;

  // Templates
  templates: TemplateInfo[];

  // Assets
  assets: Asset[];
  uploadAsset: (file: File, directory?: string) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  renameAsset: (id: string, newName: string) => Promise<void>;
  moveAsset: (sourceId: string, targetFolderId: string) => Promise<void>;
  createFolder: (name: string, parentPath?: string) => Promise<void>;

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

  // Render Preview
  previewUrl: string | null;
  setPreviewUrl: (url: string | null) => void;

  // Client-Side Export
  isExporting: boolean;
  exportProgress: number;
  exportVideo: (format: 'mp4' | 'webm') => Promise<void>;
  cancelExport: () => void;

  // Editor Integration
  openInEditor: (path: string) => void;

  // Export Job Spec
  exportJobSpec: () => Promise<void>;
}

export const StudioContext = createContext<StudioContextType | undefined>(undefined);

export const StudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addToast } = useToast();
  const [compositions, setCompositions] = useState<Composition[]>([]);
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeComposition, setActiveComposition] = useState<Composition | null>(null);
  const [isOmnibarOpen, setOmnibarOpen] = useState(false);
  const [isHelpOpen, setHelpOpen] = useState(false);
  const [isDiagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [isAssistantOpen, setAssistantOpen] = useState(false);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isDuplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateTargetId, setDuplicateTargetId] = useState<string | null>(null);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 1920, height: 1080 });
  const [renderConfig, setRenderConfig] = useState<RenderConfig>(() => {
    try {
      const saved = localStorage.getItem('helios-studio:render-config');
      return saved ? JSON.parse(saved) : { mode: 'canvas' };
    } catch (e) {
      console.warn('Failed to parse render config', e);
      return { mode: 'canvas' };
    }
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Persist Render Config
  useEffect(() => {
    localStorage.setItem('helios-studio:render-config', JSON.stringify(renderConfig));
  }, [renderConfig]);

  const [renderJobs, setRenderJobs] = useState<RenderJob[]>([]);

  // Client-Side Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const exportAbortControllerRef = useRef<AbortController | null>(null);

  const [pendingSeekFrame, setPendingSeekFrame] = useState<number | null>(null);
  const [inPoint, setInPoint] = useState(0);
  const [outPoint, setOutPoint] = useState(0);
  const [playerState, _setPlayerState] = useState<PlayerState>(DEFAULT_PLAYER_STATE);

  const setPlayerState = React.useCallback((newState: Partial<PlayerState> | ((prev: PlayerState) => PlayerState)) => {
    _setPlayerState(prev => {
      const state = typeof newState === 'function' ? newState(prev) : newState;
      return {
        ...prev,
        ...state,
        playbackRate: state.playbackRate ?? prev.playbackRate ?? 1
      };
    });
  }, []);

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

  const uploadAsset = async (file: File, directory?: string) => {
    try {
      const headers: Record<string, string> = {
        'x-filename': file.name
      };
      if (directory) {
        headers['x-directory'] = directory;
      }

      await fetch('/api/assets/upload', {
        method: 'POST',
        headers,
        body: file
      });
      fetchAssets();
      addToast('Asset uploaded successfully', 'success');
    } catch (e) {
      console.error('Failed to upload asset:', e);
      addToast('Failed to upload asset', 'error');
    }
  };

  const deleteAsset = async (id: string) => {
    try {
      await fetch(`/api/assets?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      fetchAssets();
      addToast('Asset deleted', 'success');
    } catch (e) {
      console.error('Failed to delete asset:', e);
      addToast('Failed to delete asset', 'error');
    }
  };

  const renameAsset = async (id: string, newName: string) => {
    try {
      const res = await fetch('/api/assets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, newName })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to rename asset');
      }

      fetchAssets();
    } catch (e) {
      console.error('Failed to rename asset:', e);
      throw e;
    }
  };

  const moveAsset = async (sourceId: string, targetFolderId: string) => {
    try {
      const res = await fetch('/api/assets/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, targetFolderId })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to move asset');
      }

      fetchAssets();
      addToast('Asset moved', 'success');
    } catch (e: any) {
      console.error(e);
      addToast(e.message || 'Failed to move asset', 'error');
      throw e;
    }
  };

  const createFolder = async (name: string, parentPath?: string) => {
    try {
      const dirPath = parentPath ? `${parentPath}/${name}` : name;
      const res = await fetch('/api/assets/mkdir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: dirPath })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create folder');
      }

      fetchAssets();
      addToast('Folder created', 'success');
    } catch (e: any) {
      console.error(e);
      addToast(e.message || 'Failed to create folder', 'error');
      throw e;
    }
  };

  const createComposition = async (name: string, template?: string, options?: CompositionMetadata) => {
    try {
      const res = await fetch('/api/compositions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, template, ...options })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create composition');
      }

      const newComp = await res.json();

      // Refresh list
      const listRes = await fetch('/api/compositions');
      const data = await listRes.json();
      setCompositions(data);

      // Set active
      // Find the new comp in the refreshed list to ensure we have the correct object reference if needed
      const found = data.find((c: Composition) => c.id === newComp.id);
      if (found) {
        setActiveComposition(found);
      } else {
        setActiveComposition(newComp);
      }

      setCreateOpen(false);
      addToast('Composition created', 'success');
    } catch (e: any) {
      console.error(e);
      addToast(e.message || 'Failed to create composition', 'error');
      throw e;
    }
  };

  const duplicateComposition = async (sourceId: string, newName: string) => {
    try {
      const res = await fetch('/api/compositions/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, newName })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to duplicate composition');
      }

      const newComp = await res.json();

      // Refresh list
      const listRes = await fetch('/api/compositions');
      const data = await listRes.json();
      setCompositions(data);

      // Set active to the new one
      const found = data.find((c: Composition) => c.id === newComp.id);
      if (found) {
        setActiveComposition(found);
      } else {
        setActiveComposition(newComp);
      }

      setDuplicateOpen(false);
      addToast('Composition duplicated', 'success');
    } catch (e: any) {
      console.error(e);
      addToast(e.message || 'Failed to duplicate composition', 'error');
      throw e;
    }
  };

  const updateCompositionMetadata = async (id: string, metadata: CompositionMetadata, name?: string) => {
    try {
      const body: any = { id, ...metadata };
      if (name) body.name = name;

      const res = await fetch('/api/compositions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update composition');
      }

      const updatedComp = await res.json();

      setCompositions((prev: Composition[]) => prev.map(c => c.id === id ? updatedComp : c));

      if (activeComposition?.id === id) {
        setActiveComposition(updatedComp);
      }
      addToast('Composition updated', 'success');
    } catch (e: any) {
      console.error(e);
      addToast(e.message || 'Failed to update composition', 'error');
      throw e;
    }
  };

  const updateThumbnail = async (id: string) => {
    if (!controller) return;

    const frameNumber = playerState.currentFrame;
    const mode = renderConfig.mode;

    try {
      const result = await controller.captureFrame(frameNumber, { mode });
      if (!result || !result.frame) return;

      const { frame: videoFrame } = result;

      // Create canvas for resizing
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 320;
      const scale = Math.min(1, MAX_WIDTH / videoFrame.displayWidth);
      canvas.width = videoFrame.displayWidth * scale;
      canvas.height = videoFrame.displayHeight * scale;

      const ctx = canvas.getContext('2d');
      if (ctx) {
         ctx.drawImage(videoFrame, 0, 0, canvas.width, canvas.height);

         canvas.toBlob(async (blob) => {
             if (!blob) return;

             try {
                 const res = await fetch(`/api/compositions/${encodeURIComponent(id)}/thumbnail`, {
                     method: 'POST',
                     body: blob
                 });

                 if (!res.ok) {
                     console.error('Failed to upload thumbnail');
                     return;
                 }

                 // Refresh compositions to get new thumbnail URL
                 const listRes = await fetch('/api/compositions');
                 const data = await listRes.json();

                 // Append timestamp to bust cache if URL is same
                 const dataWithCacheBust = data.map((c: Composition) => {
                    if (c.id === id && c.thumbnailUrl) {
                        return { ...c, thumbnailUrl: `${c.thumbnailUrl}?t=${Date.now()}` };
                    }
                    return c;
                 });

                 setCompositions(dataWithCacheBust);

                 // Update active composition if needed
                 if (activeComposition?.id === id) {
                     const updated = dataWithCacheBust.find((c: Composition) => c.id === id);
                     if (updated) setActiveComposition(updated);
                 }

             } catch (e) {
                 console.error('Error updating thumbnail:', e);
             }
         }, 'image/png');
      }

      videoFrame.close();
    } catch (e) {
      console.error("Thumbnail capture failed", e);
      addToast('Failed to capture thumbnail', 'error');
    }
  };

  const deleteComposition = async (id: string) => {
    try {
      const res = await fetch(`/api/compositions?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete composition');
      }

      setCompositions((prev: Composition[]) => {
        const next = prev.filter(c => c.id !== id);
        if (activeComposition?.id === id) {
           setActiveComposition(next.length > 0 ? next[0] : null);
        }
        return next;
      });
      addToast('Composition deleted', 'success');
    } catch (e: any) {
      console.error(e);
      addToast(e.message || 'Failed to delete composition', 'error');
      throw e;
    }
  };

  // Fetch compositions and assets from backend
  useEffect(() => {
    fetch('/api/templates')
      .then(res => res.json())
      .then((data: TemplateInfo[]) => {
        setTemplates(data);
      })
      .catch(err => {
        console.error('Failed to fetch templates:', err);
      });

    fetch('/api/compositions')
      .then(res => res.json())
      .then((data: Composition[]) => {
        setCompositions(data);

        let targetComp = null;

        // Try to restore from localStorage
        try {
           const savedId = localStorage.getItem('helios-studio:active-composition-id');
           if (savedId) {
             const parsedId = JSON.parse(savedId);
             targetComp = data.find((c: Composition) => c.id === parsedId);
           }
        } catch (e) {}

        // Fallback to first if not found
        if (!targetComp && data.length > 0) {
           targetComp = data[0];
        }

        // Only set if we found something and no active composition is set yet
        if (targetComp && !activeComposition) {
           setActiveComposition(targetComp);
        }
      })
      .catch(err => {
        console.error('Failed to fetch compositions:', err);
      });

    fetchAssets();
  }, []);

  // Persist active composition ID
  useEffect(() => {
    if (activeComposition) {
      localStorage.setItem('helios-studio:active-composition-id', JSON.stringify(activeComposition.id));
    }
  }, [activeComposition]);

  const [controller, setController] = useState<HeliosController | null>(null);
  const [loop, setLoop] = useState(false);
  const toggleLoop = () => setLoop(prev => !prev);

  const loadTimelineState = (compId: string) => {
    try {
      const saved = localStorage.getItem(`helios-studio:timeline:${compId}`);
      if (saved) {
        const state: TimelineState = JSON.parse(saved);
        setInPoint(state.inPoint ?? 0);
        setOutPoint(state.outPoint ?? 0);
        setLoop(state.loop ?? false);
        if (typeof state.frame === 'number') {
          setPendingSeekFrame(state.frame);
        }
      } else {
        setInPoint(0);
        setOutPoint(0);
        setLoop(false);
      }
    } catch (e) {
      console.warn('Failed to load timeline state', e);
    }
  };

  const saveTimelineState = (compId: string) => {
    try {
      const state: TimelineState = {
        inPoint,
        outPoint,
        loop,
        frame: playerState.currentFrame
      };
      localStorage.setItem(`helios-studio:timeline:${compId}`, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save timeline state', e);
    }
  };

  // Load timeline state when composition changes
  useEffect(() => {
    if (activeComposition) {
      loadTimelineState(activeComposition.id);
    }
  }, [activeComposition?.id]);

  // Save timeline state on change
  useEffect(() => {
    if (activeComposition) {
      saveTimelineState(activeComposition.id);
    }
  }, [inPoint, outPoint, loop, activeComposition?.id]);

  // Save timeline state on pause
  useEffect(() => {
    if (activeComposition && !playerState.isPlaying) {
      saveTimelineState(activeComposition.id);
    }
  }, [playerState.isPlaying, activeComposition?.id]);

  // Save timeline state on unload
  useEffect(() => {
    const handleUnload = () => {
      if (activeComposition) {
        saveTimelineState(activeComposition.id);
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [activeComposition, inPoint, outPoint, loop, playerState.currentFrame]);

  // Handle pending seek
  useEffect(() => {
    if (controller && pendingSeekFrame !== null) {
      controller.seek(pendingSeekFrame);
      setPendingSeekFrame(null);
    }
  }, [controller, pendingSeekFrame]);

  // Update canvas size when composition metadata is available
  useEffect(() => {
    if (activeComposition?.metadata) {
      const { width, height } = activeComposition.metadata;
      setCanvasSize({ width, height });
    }
  }, [activeComposition]);

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
    const scale = renderConfig.scale || 1;
    // Ensure even dimensions for FFmpeg compatibility
    const width = Math.floor((canvasSize.width * scale) / 2) * 2;
    const height = Math.floor((canvasSize.height * scale) / 2) * 2;

    try {
      await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compositionUrl: comp.url,
          fps,
          duration,
          width,
          height,
          inPoint: options?.inPoint,
          outPoint: options?.outPoint,
          inputProps: playerState.inputProps,
          ...renderConfig
        })
      });
      fetchJobs();
      addToast('Render started', 'success');
    } catch (err) {
      console.error('Failed to start render:', err);
      addToast('Failed to start render', 'error');
    }
  };

  const cancelRender = async (jobId: string) => {
    try {
      await fetch(`/api/jobs/${jobId}/cancel`, { method: 'POST' });
      fetchJobs();
      addToast('Render cancelled', 'info');
    } catch (err) {
      console.error('Failed to cancel render:', err);
      addToast('Failed to cancel render', 'error');
    }
  };

  const deleteRender = async (jobId: string) => {
    try {
      await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
      fetchJobs();
      addToast('Render job deleted', 'success');
    } catch (err) {
      console.error('Failed to delete render:', err);
      addToast('Failed to delete render', 'error');
    }
  };

  // Sync Loop State
  useEffect(() => {
    if (controller) {
      controller.setLoop(loop);
    }
  }, [controller, loop]);

  // Sync Playback Range
  useEffect(() => {
    if (!controller) return;

    const { duration, fps } = playerState;
    // Default handling: if outPoint is 0, treat as full duration
    const maxFrame = Math.floor(duration * fps);
    const effectiveOut = outPoint === 0 ? maxFrame : outPoint;

    // If range is full video (or invalid), clear it
    if (inPoint === 0 && (outPoint === 0 || effectiveOut >= maxFrame)) {
      controller.clearPlaybackRange();
    } else {
      // Otherwise set strict range
      controller.setPlaybackRange(inPoint, effectiveOut);
    }
  }, [controller, inPoint, outPoint, playerState.duration, playerState.fps]);

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
        addToast('Snapshot saved', 'success');
      }

      videoFrame.close();
    } catch (e) {
      console.error("Snapshot failed", e);
      addToast('Failed to take snapshot', 'error');
    }
  };

  const exportVideo = async (format: 'mp4' | 'webm') => {
    if (!controller) return;

    // Reset state
    setIsExporting(true);
    setExportProgress(0);

    // Create new abort controller
    exportAbortControllerRef.current = new AbortController();

    // Instantiate exporter
    const exporter = new ClientSideExporter(controller);

    const scale = renderConfig.scale || 1;
    // Ensure even dimensions for FFmpeg compatibility
    const width = Math.floor((canvasSize.width * scale) / 2) * 2;
    const height = Math.floor((canvasSize.height * scale) / 2) * 2;

    let bitrate: number | undefined;
    if (renderConfig.videoBitrate) {
      const match = renderConfig.videoBitrate.match(/^(\d+)([km])?$/i);
      if (match) {
        const val = parseInt(match[1], 10);
        const unit = (match[2] || '').toLowerCase();
        if (unit === 'k') bitrate = val * 1000;
        else if (unit === 'm') bitrate = val * 1000000;
        else bitrate = val;
      }
    }

    try {
      await exporter.export({
        format,
        mode: renderConfig.mode === 'dom' ? 'dom' : 'canvas',
        onProgress: (p: number) => setExportProgress(p),
        signal: exportAbortControllerRef.current.signal,
        includeCaptions: true, // Or expose as option if needed
        width,
        height,
        bitrate
      });
    } catch (e: any) {
      if (e.message !== "Export aborted") {
        console.error("Export failed:", e);
        addToast(e.message || 'Export failed', 'error');
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

  const exportJobSpec = async () => {
    if (!activeComposition) return;
    const { fps, duration } = playerState;
    const scale = renderConfig.scale || 1;
    // Ensure even dimensions for FFmpeg compatibility
    const width = Math.floor((canvasSize.width * scale) / 2) * 2;
    const height = Math.floor((canvasSize.height * scale) / 2) * 2;

    try {
      const res = await fetch('/api/render/job-spec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compositionUrl: activeComposition.url,
          fps,
          duration,
          width,
          height,
          inPoint,
          outPoint,
          inputProps: playerState.inputProps,
          ...renderConfig
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate job spec');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `job-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      addToast('Job spec exported', 'success');
    } catch (e: any) {
      console.error('Failed to export job spec:', e);
      addToast(e.message || 'Failed to export job spec', 'error');
    }
  };

  const openInEditor = (path: string) => {
    const safePath = path.replace(/^\/@fs/, '');
    fetch('/__open-in-editor?file=' + encodeURIComponent(safePath))
      .catch(err => console.error('Failed to open in editor', err));
  };

  return (
    <StudioContext.Provider
      value={{
        compositions,
        templates,
        assets,
        uploadAsset,
        deleteAsset,
        renameAsset,
        moveAsset,
        createFolder,
        activeComposition,
        setActiveComposition,
        isOmnibarOpen,
        setOmnibarOpen,
        isHelpOpen,
        setHelpOpen,
        isDiagnosticsOpen,
        setDiagnosticsOpen,
        isAssistantOpen,
        setAssistantOpen,
        isCreateOpen,
        setCreateOpen,
        isDuplicateOpen,
        setDuplicateOpen,
        duplicateTargetId,
        setDuplicateTargetId,
        isSettingsOpen,
        setSettingsOpen,
        createComposition,
        duplicateComposition,
        updateCompositionMetadata,
        updateThumbnail,
        deleteComposition,
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
        previewUrl,
        setPreviewUrl,
        isExporting,
        exportProgress,
        exportVideo,
        cancelExport,
        openInEditor,
        exportJobSpec
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
