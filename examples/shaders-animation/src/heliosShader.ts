import {
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
   * those: `import { componentDefinition as Aurora } from 'shaders/core/Aurora'`.
   * Components made with `defineShader` go here too.
   */
  components: GpuShaderDefinition[];
  /** Runs before each frame is drawn. Animate props from the composition time here. */
  onFrame?: (time: number, shader: HeliosShader) => void;
}

export interface HeliosShader {
  /** Change props on the layer with this `id`, like `createShader`'s `update`. */
  update(id: string, props: Record<string, unknown>): void;
  /** Draw the frame at `time` seconds. Helios calls this on every frame and seek. */
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
 * Renders a Shaders (https://shaders.com) preset on `canvas`, driven by Helios time instead of
 * the browser clock, so every frame renders the same way in the preview, in `helios render`
 * and on distributed workers. Takes the same preset JSON as `createShader` from `shaders/js`.
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
      console.warn(`[helios-shader] Add "${layer.type}" to \`components\`: import { componentDefinition as ${layer.type} } from 'shaders/core/${layer.type}'`);
      return;
    }
    const id = layer.id ?? `${layer.type}-${layers.size}`;
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

  // The renderer keeps a global `time` and a per-layer clock that adds `delta * speed`. Both
  // move only when a frame is drawn, by the same delta, so drawing with `time - rendererTime()`
  // puts every layer at Helios time, whatever order frames are requested in.
  let drawnTime = 0;
  const rendererTime = () => renderer.__testing?.getFrameDiagnostics?.().globalElapsedTime ?? drawnTime;

  let changed = false;
  const update = (id: string, props: Record<string, unknown>) => {
    const definition = layers.get(id);
    if (!definition) {
      console.warn(`[helios-shader] No layer with id "${id}"`);
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
