import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ComponentDefinition, ComponentFile } from './types.js';

/**
 * A file whose source is a module in ./components, unit-tested with the rest of the CLI. The
 * build copies those .ts files next to the compiled manifest (scripts/copy-registry.js), so the
 * same relative path works from src and from dist. The source is read when the component is
 * installed or diffed, not when the CLI starts.
 */
function sourceFile(name: string): ComponentFile {
  return {
    name,
    get content() {
      const url = new URL(`./components/${name}`, import.meta.url);
      try {
        return readFileSync(url, 'utf8');
      } catch {
        throw new Error(`The CLI is missing the source of ${name} (${fileURLToPath(url)}). Rebuild it with "npm run build -w packages/cli".`);
      }
    },
  };
}

const TIMER_CODE = `import React from 'react';
import { useVideoFrame } from './useVideoFrame';
import { Helios } from '@helios-project/core';

interface TimerProps {
  helios?: Helios;
  style?: React.CSSProperties;
}

export const Timer: React.FC<TimerProps> = ({ helios: propHelios, style }) => {
  const heliosInstance = propHelios || (typeof window !== 'undefined' ? (window as any).helios : null);
  const frame = useVideoFrame(heliosInstance);

  if (!heliosInstance) {
     return <div style={style}>Helios instance not found</div>;
  }

  const fps = heliosInstance.fps.value || 30;
  const time = frame / fps;

  // Format time as MM:SS:FF
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  const frames = Math.floor(frame % fps);

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div style={{
      fontFamily: 'monospace',
      fontSize: '24px',
      color: 'white',
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: '8px 12px',
      borderRadius: '4px',
      ...style
    }}>
      {pad(minutes)}:{pad(seconds)}:{pad(frames)}
    </div>
  );
};
`;

const USE_VIDEO_FRAME_CODE = `import { useState, useEffect } from 'react';
import { Helios } from '@helios-project/core';

export function useVideoFrame(helios: Helios | undefined) {
    const [frame, setFrame] = useState(helios?.getState().currentFrame ?? 0);

    useEffect(() => {
        if (!helios) return;

        // Update local state when helios state changes
        const update = (state: any) => setFrame(state.currentFrame);

        // Subscribe returns an unsubscribe function
        return helios.subscribe(update);
    }, [helios]);

    return frame;
}
`;

const PROGRESS_BAR_CODE = `import React from 'react';
import { useVideoFrame } from './useVideoFrame';
import { Helios } from '@helios-project/core';

interface ProgressBarProps {
  helios?: Helios;
  style?: React.CSSProperties;
  color?: string;
  height?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  helios: propHelios,
  style,
  color = '#fff',
  height = '4px'
}) => {
  const heliosInstance = propHelios || (typeof window !== 'undefined' ? (window as any).helios : null);
  const frame = useVideoFrame(heliosInstance);

  if (!heliosInstance) return null;

  const duration = heliosInstance.duration.value || 1;
  const fps = heliosInstance.fps.value || 30;
  const totalFrames = duration * fps;

  const progress = Math.min(Math.max(frame / totalFrames, 0), 1);

  return (
    <div style={{
      width: '100%',
      backgroundColor: 'rgba(255,255,255,0.2)',
      height,
      borderRadius: '2px',
      overflow: 'hidden',
      ...style
    }}>
      <div style={{
        width: \`\${progress * 100}%\`,
        height: '100%',
        backgroundColor: color,
      }} />
    </div>
  );
};
`;

const WATERMARK_CODE = `import React from 'react';

interface WatermarkProps {
  text?: string;
  image?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  opacity?: number;
  style?: React.CSSProperties;
}

export const Watermark: React.FC<WatermarkProps> = ({
  text = 'Helios',
  image,
  position = 'bottom-right',
  opacity = 0.5,
  style
}) => {
  const getPositionStyle = () => {
    switch(position) {
      case 'top-left': return { top: 20, left: 20 };
      case 'top-right': return { top: 20, right: 20 };
      case 'bottom-left': return { bottom: 20, left: 20 };
      case 'bottom-right': return { bottom: 20, right: 20 };
      default: return { bottom: 20, right: 20 };
    }
  };

  return (
    <div style={{
      position: 'absolute',
      ...getPositionStyle(),
      opacity,
      pointerEvents: 'none',
      fontFamily: 'sans-serif',
      fontWeight: 'bold',
      color: 'white',
      textShadow: '0 1px 2px rgba(0,0,0,0.5)',
      ...style
    }}>
      {image ? (
        <img src={image} alt="watermark" style={{ maxHeight: '40px' }} />
      ) : (
        <span>{text}</span>
      )}
    </div>
  );
};
`;

const HELIOS_SHADER_CODE = `import {
  createGpuUniformsMap,
  getRegisteredShader,
  resolveBoundingBox,
  rootPassthrough,
  shaderRendererGPU,
} from 'shaders/core';
import type {
  ComponentConfig,
  GpuShaderDefinition,
  NodeMetadata,
  PresetConfig,
  PropDriver,
} from 'shaders/core';
import type { Helios } from '@helios-project/core';

export interface HeliosShaderOptions {
  /** The composition's Helios instance. Every frame it reaches is drawn at exactly that time. */
  helios: Helios;
  /**
   * Every Shaders component the preset uses, imported one by one so the bundle only carries
   * those: \`import { componentDefinition as Aurora } from 'shaders/core/Aurora'\`.
   * Components made with \`defineShader\` go here too.
   */
  components: GpuShaderDefinition[];
  /** Runs before each frame is drawn. Animate props from the composition time here. */
  onFrame?: (time: number, shader: HeliosShader) => void;
}

export interface HeliosShader {
  /** Change props on the layer with this \`id\`, like \`createShader\`'s \`update\`. */
  update(id: string, props: Record<string, unknown>): void;
  /** Draw the frame at \`time\` seconds. Helios calls this on every frame and seek. */
  renderAt(time: number): Promise<void>;
  destroy(): void;
}

const METADATA_PROPS = new Set(['opacity', 'blendMode', 'visible', 'transform', 'boundingBox', 'maskSource', 'maskType', 'flow', 'absolute']);
const DRIVER_TYPES = new Set(['map', 'mouse', 'mouse-position', 'auto-animate']);

function isPropDriver(value: unknown): value is PropDriver {
  return typeof value === 'object' && value !== null && DRIVER_TYPES.has((value as { type?: unknown }).type as string);
}

function withTransformDefaults(transform: object) {
  return { offsetX: 0, offsetY: 0, rotation: 0, scale: 1, anchorX: 0.5, anchorY: 0.5, edges: 'transparent' as const, ...transform };
}

/**
 * Renders a Shaders (https://shaders.com) preset on \`canvas\`, driven by Helios time instead of
 * the browser clock, so every frame renders the same way in the preview, in \`helios render\`
 * and on distributed workers. Takes the same preset JSON as \`createShader\` from \`shaders/js\`.
 */
export async function createHeliosShader(
  canvas: HTMLCanvasElement,
  preset: PresetConfig,
  options: HeliosShaderOptions,
): Promise<HeliosShader> {
  const { helios, onFrame } = options;
  const definitions = new Map(options.components.map((definition) => [definition.name, definition]));

  const renderer = shaderRendererGPU();
  // Helios decides when frames are drawn: no animation loop, no visibility throttling.
  await renderer.initialize({ canvas, resizeTarget: canvas, observeElement: false, forceFullFrameRate: true });
  renderer.stopAnimation();

  const layers = new Map<string, GpuShaderDefinition>();
  const rootId = 'helios-shader-root';
  renderer.registerNode(rootId, rootPassthrough.fragment, null, null, {}, rootPassthrough);

  const register = (layer: ComponentConfig, parentId: string, renderOrder: number) => {
    const definition = definitions.get(layer.type) ?? getRegisteredShader(layer.type);
    if (!definition) {
      console.warn(\`[helios-shader] Add "\${layer.type}" to \\\`components\\\`: import { componentDefinition as \${layer.type} } from 'shaders/core/\${layer.type}'\`);
      return;
    }
    const id = layer.id ?? \`\${layer.type}-\${layers.size}\`;
    const props = layer.props ?? {};
    const maps: Record<string, PropDriver> = {};
    const values = Object.fromEntries(Object.entries(definition.props).map(([key, config]) => {
      const value = props[key] !== undefined ? props[key] : config.default;
      if (!isPropDriver(value)) return [key, value];
      if (!METADATA_PROPS.has(key)) maps[key] = value;
      return [key, config.default];
    }));
    const metadata: NodeMetadata = {
      blendMode: props.blendMode ?? 'normal',
      opacity: props.opacity,
      visible: props.visible,
      renderOrder,
      id: layer.id,
      maps: Object.keys(maps).length > 0 ? maps : undefined,
      mask: props.maskSource ? { source: props.maskSource, type: props.maskType ?? 'alpha' } : undefined,
      transform: props.transform ? withTransformDefaults(props.transform) : undefined,
      boundingBox: resolveBoundingBox(props.boundingBox),
      flow: props.flow,
      absolute: props.absolute,
    };
    renderer.registerNode(id, definition.fragment, parentId, metadata, createGpuUniformsMap(definition, values, id), definition);
    layers.set(id, definition);
    layer.children?.forEach((child, index) => register(child, id, index));
  };
  preset.components.forEach((layer, index) => register(layer, rootId, index));

  // The renderer keeps a global \`time\` and a per-layer clock that adds \`delta * speed\`. Both
  // move only when a frame is drawn, by the same delta, so drawing with \`time - rendererTime()\`
  // puts every layer at Helios time, whatever order frames are requested in.
  let drawnTime = 0;
  const rendererTime = () => renderer.__testing?.getFrameDiagnostics?.().globalElapsedTime ?? drawnTime;

  let changed = false;
  const update = (id: string, props: Record<string, unknown>) => {
    const definition = layers.get(id);
    if (!definition) {
      console.warn(\`[helios-shader] No layer with id "\${id}"\`);
      return;
    }
    changed = true;
    for (const [key, value] of Object.entries(props)) {
      if (key === 'transform') renderer.updateNodeMetadata(id, { transform: withTransformDefaults(value as object) });
      else if (key === 'boundingBox') renderer.updateNodeMetadata(id, { boundingBox: resolveBoundingBox(value as never) });
      else if (key === 'opacity' || key === 'visible' || key === 'blendMode') renderer.updateNodeMetadata(id, { [key]: value });
      else if (Object.prototype.hasOwnProperty.call(definition.props, key)) renderer.updateUniformValue(id, key, value);
    }
  };

  const draw = async (time: number) => {
    onFrame?.(time, shader);
    await renderer.renderSyntheticFrame(time - rendererTime());
    // A prop change can move the renderer to a rebuilt pipeline, which it only shows from the
    // next frame on. Draw again at the same time so this frame is complete.
    if (changed) await renderer.renderSyntheticFrame(time - rendererTime());
    changed = false;
    drawnTime = time;
  };

  // During playback only the newest requested time is drawn, so a slow GPU never builds a backlog.
  let target: number | null = null;
  let drawing: Promise<void> | null = null;
  const drain = async () => {
    while (target !== null) {
      const time = target;
      target = null;
      try {
        await draw(time);
      } catch (error) {
        console.error('[helios-shader] Frame failed:', error);
      }
    }
    drawing = null;
  };

  const shader: HeliosShader = {
    update,
    renderAt(time) {
      target = time;
      drawing ??= drain();
      return drawing;
    },
    destroy() {
      unsubscribe();
      unregisterCheck();
      renderer.cleanup();
    },
  };

  const unsubscribe = helios.subscribe((state) => void shader.renderAt(state.currentTime));
  // The renderer captures a frame only after this settles, so it never records a half-drawn one.
  const unregisterCheck = helios.registerStabilityCheck(() => drawing ?? Promise.resolve());
  return shader;
}
`;

export const registry: ComponentDefinition[] = [
  {
    name: 'use-video-frame',
    description: 'React hook for synchronizing with the video frame.',
    type: 'react',
    files: [
      {
        name: 'useVideoFrame.ts',
        content: USE_VIDEO_FRAME_CODE,
      },
    ],
    dependencies: {
      'react': '^18.0.0',
      '@helios-project/core': 'latest'
    }
  },
  {
    name: 'timer',
    description: 'Displays a countdown or stopwatch synchronized with the video frame.',
    type: 'react',
    files: [
      {
        name: 'Timer.tsx',
        content: TIMER_CODE,
      },
    ],
    dependencies: {
      'react': '^18.0.0',
      '@helios-project/core': 'latest'
    },
    registryDependencies: ['use-video-frame']
  },
  {
    name: 'progress-bar',
    description: 'Visualizes playback progress.',
    type: 'react',
    files: [
      {
        name: 'ProgressBar.tsx',
        content: PROGRESS_BAR_CODE,
      },
    ],
    dependencies: {
      'react': '^18.0.0',
      '@helios-project/core': 'latest'
    },
    registryDependencies: ['use-video-frame']
  },
  {
    name: 'watermark',
    description: 'Overlay text or image logo.',
    type: 'react',
    files: [
      {
        name: 'Watermark.tsx',
        content: WATERMARK_CODE,
      },
    ],
    dependencies: {
      'react': '^18.0.0',
    }
  },
  {
    name: 'shaders',
    description: 'Renders Shaders (shaders.com) WebGPU effects on Helios time.',
    type: 'vanilla',
    files: [
      {
        name: 'heliosShader.ts',
        content: HELIOS_SHADER_CODE,
      },
    ],
    dependencies: {
      'shaders': '^4.0.0',
      '@helios-project/core': 'latest'
    }
  },
  {
    name: 'beat-clock',
    description: 'Beats, bars, kick pulses, hits, sections and loudness at any time, from `helios analyze` output.',
    type: 'vanilla',
    files: [sourceFile('beatClock.ts')],
  },
  {
    name: 'cursor',
    description: 'A scripted mouse pointer with human reaches, whose clicks land on the times you give.',
    type: 'vanilla',
    files: [sourceFile('cursor.ts')],
  },
];

export function findComponent(name: string): ComponentDefinition | undefined {
  return registry.find((c) => c.name === name);
}
