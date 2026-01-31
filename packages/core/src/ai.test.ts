import { describe, it, expect } from 'vitest';
import { Helios } from './index.js';
import { createSystemPrompt, HELIOS_BASE_PROMPT } from './ai.js';

describe('AI System Prompt', () => {
  it('generates prompt for basic Helios instance', () => {
    const helios = new Helios({
      duration: 10,
      fps: 30,
      width: 1920,
      height: 1080
    });

    const prompt = createSystemPrompt(helios);

    expect(prompt).toContain(HELIOS_BASE_PROMPT);
    expect(prompt).toContain('Duration: 10s');
    expect(prompt).toContain('FPS: 30');
    expect(prompt).toContain('Resolution: 1920x1080');
    expect(prompt).toContain('No schema defined');
  });

  it('generates prompt including schema', () => {
    const helios = new Helios({
      duration: 5,
      fps: 60,
      schema: {
        title: { type: 'string' },
        count: { type: 'number' }
      },
      inputProps: {
        title: 'Hello',
        count: 42
      }
    });

    const prompt = createSystemPrompt(helios);

    expect(prompt).toContain('Duration: 5s');
    expect(prompt).toContain('FPS: 60');
    expect(prompt).toContain('Props Schema:');
    expect(prompt).toContain('"title": {');
    expect(prompt).toContain('"type": "string"');
    expect(prompt).toContain('"count": {');
    expect(prompt).toContain('"type": "number"');
  });
});
