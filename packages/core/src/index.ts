// ═══════════════════════════════════════════
// @helios-project/core — Public API
// ═══════════════════════════════════════════
// This barrel file defines the explicit public API surface.
// Internal implementation details should not be exported here.

// Core Engine
export { Helios } from './Helios.js';
export type { HeliosState, HeliosSubscriber, HeliosOptions, DiagnosticReport, StabilityCheck } from './Helios.js';

// Types
export type { HeliosConfig, AudioTrackState, HeliosTimeline, HeliosClip, HeliosTrack } from './types.js';

// Drivers
export { TimeDriver, DomDriver, NoopDriver, RafTicker, TimeoutTicker } from './drivers/index.js';
export type { Ticker, AudioTrackMetadata } from './drivers/index.js';

// Animation Utilities
export { interpolate, spring, calculateSpringDuration } from './animation.js';
export type { SpringConfig, InterpolateOptions, SpringOptions, ExtrapolateType } from './animation.js';

// Easing Functions
export { Easing } from './easing.js';

// Sequencing
export { sequence, series, stagger, shift } from './sequencing.js';
export type { SequenceOptions, SequenceResult, SeriesItem } from './sequencing.js';

// Signals (public reactive primitives)
export { signal, computed, effect } from './signals.js';
export type { Signal, ReadonlySignal } from './signals.js';

// Errors
export { HeliosError, HeliosErrorCode } from './errors.js';

// Captions
export { parseSrt, parseCaptions, findActiveCues } from './captions.js';
export type { CaptionCue } from './captions.js';

// Schema & Validation
export { validateProps, validateSchema } from './schema.js';
export type { HeliosSchema, PropDefinition, PropType } from './schema.js';

// Utilities
export { random } from './random.js';
export { parseColor, interpolateColors } from './color.js';
export type { RgbaColor } from './color.js';
export { framesToTimecode, timecodeToFrames } from './timecode.js';

// Markers
export { validateMarker, validateMarkers } from './markers.js';
export type { Marker } from './markers.js';

// Transitions
export { transition, crossfade } from './transitions.js';
export type { TransitionOptions, CrossfadeResult } from './transitions.js';

// AI Integration
export { createSystemPrompt, HELIOS_BASE_PROMPT } from './ai.js';

// Render Session (for renderer integration)
export { RenderSession } from './render-session.js';

// Version
export const VERSION = '5.13.0';
