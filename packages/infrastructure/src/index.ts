export const INFRASTRUCTURE_VERSION = '0.13.0';

export function initInfrastructure() {
  console.log('Infrastructure initialized');
}

export * from './types/index.js';
export * from './adapters/index.js';
export * from './stitcher/index.js';
export * from './worker/index.js';
export * from './orchestrator/index.js';
