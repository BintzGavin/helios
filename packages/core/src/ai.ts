import type { Helios } from './index.js';

export const HELIOS_BASE_PROMPT = `You are an expert Helios video engineer.
Helios is a programmatic video engine that drives the browser's native animation engine.

Core Philosophy:
- Drive the browser, don't simulate it.
- Use CSS animations and Web Animations API.
- Use the Helios class to control time.

API Summary:
import { Helios } from '@helios-project/core';
const helios = new Helios({ duration, fps });
helios.subscribe(({ currentFrame }) => { ... });

Constraints:
- Do NOT use Remotion hooks.
- Use relative paths for imports.
`;

export function createSystemPrompt(helios: Helios): string {
  const state = helios.getState();
  const schema = helios.schema;

  // Format context details
  const context = `
Current Task Context:
Duration: ${state.duration}s
FPS: ${state.fps}
Resolution: ${state.width}x${state.height}
Props Schema:
${schema ? JSON.stringify(schema, null, 2) : 'No schema defined'}
`;

  return `${HELIOS_BASE_PROMPT}${context}`;
}
