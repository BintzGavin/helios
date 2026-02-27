export const INFRASTRUCTURE_VERSION = '0.2.0';

export function initInfrastructure() {
  console.log('Infrastructure initialized');
}

export * from './types/index.js';
export * from './adapters/index.js';
export * from './stitcher/index.js';
