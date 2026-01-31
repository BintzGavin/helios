# Plan: Implement AI System Prompt Generator in Core

## 1. Context & Goal
- **Objective**: Implement a programmatic way to generate an AI system prompt that describes the current Helios composition context.
- **Trigger**: Vision gap in `README.md` ("System prompt for LLM code generation") identified during "AI Integration Parity" audit.
- **Impact**: Enables AI agents (and users via Studio/CLI) to get a standardized, machine-readable description of the current composition state, schema, and constraints, facilitating accurate code generation and assistance.

## 2. File Inventory
- **Create**:
    - `packages/core/src/ai.ts`: Logic for prompt generation.
    - `packages/core/src/ai.test.ts`: Unit tests.
- **Modify**:
    - `packages/core/src/index.ts`: Export the new functionality.
- **Read-Only**:
    - `packages/core/src/schema.ts`
    - `packages/core/src/index.ts`

## 3. Implementation Spec
- **Architecture**: Functional utility pattern.
- **Pseudo-Code**:
  ```typescript
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

     return `${HELIOS_BASE_PROMPT}\n${context}`;
  }
  ```
- **Public API Changes**:
    - New export `createSystemPrompt`.
    - New export `HELIOS_BASE_PROMPT`.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
    - `ai.test.ts` passes.
    - Generated prompt contains duration, fps, and schema JSON.
- **Edge Cases**:
    - Helios instance with no schema.
    - Helios instance with 0 duration.
