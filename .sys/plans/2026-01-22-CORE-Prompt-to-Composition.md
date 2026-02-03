# Context & Goal
- **Objective**: Implement serializable `HeliosConfig` and `HeliosTimeline` schemas to enable "Prompt to Composition" workflows and distributed rendering.
- **Trigger**: Backlog items "Prompt to Composition" (structured prompt schema) and "Distributed Rendering" (serializable config).
- **Impact**: Unlocks the ability for LLMs to generate valid composition specifications (JSON) that can be executed by Helios without manual code assembly. Also simplifies passing configuration to stateless render workers.

# File Inventory
- **Create**: `packages/core/src/composition-spec.ts` - Will contain `HeliosConfig`, `HeliosClip`, `HeliosTimeline` interfaces and validation functions.
- **Create**: `packages/core/src/composition-spec.test.ts` - Tests for the new schemas.
- **Modify**: `packages/core/src/Helios.ts` - Refactor `HeliosOptions` to extend the new `HeliosConfig`.
- **Modify**: `packages/core/src/index.ts` - Export the new types and validators.
- **Read-Only**: `packages/core/src/schema.ts` (for reference on validation patterns).

# Implementation Spec
- **Architecture**:
  - Extract purely serializable properties from `HeliosOptions` into a new `HeliosConfig` interface.
  - Define `HeliosTimeline` as a recursive or flat structure of `HeliosClip` items, enabling a declarative description of a video sequence (e.g. "Series of clips").
  - Implement runtime validators (`validateHeliosConfig`, `validateTimeline`) similar to `validateProps`.
  - Ensure `HeliosOptions` (runtime) inherits from `HeliosConfig` (serializable) to maintain backward compatibility while enforcing strict separation of concerns.

- **Pseudo-Code**:
  ```typescript
  // composition-spec.ts
  export interface HeliosConfig<T = any> {
      width?: number;
      height?: number;
      fps: number;
      duration: number;
      inputProps?: T;
      // ... all other serializable props (audioTracks, captions, etc)
  }

  export interface HeliosClip {
      id?: string;
      type: 'video' | 'image' | 'text' | 'audio' | string;
      src?: string;
      content?: string; // for text
      durationInFrames: number;
      offset?: number;
      props?: Record<string, any>;
  }

  export interface HeliosTimeline {
      mode: 'series' | 'parallel' | 'sequence';
      items: HeliosClip[];
  }

  export function validateHeliosConfig(config: unknown): HeliosConfig { ... }
  export function validateTimeline(timeline: unknown): HeliosTimeline { ... }
  ```

  ```typescript
  // Helios.ts
  import { HeliosConfig } from './composition-spec';

  export interface HeliosOptions<T> extends HeliosConfig<T> {
      driver?: TimeDriver;
      ticker?: Ticker;
      animationScope?: unknown;
  }
  ```

- **Public API Changes**:
  - New exports: `HeliosConfig`, `HeliosClip`, `HeliosTimeline`.
  - `HeliosOptions` interface structure slightly refactored (inheritance) but API remains compatible.

- **Dependencies**: None.

# Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - `packages/core/src/composition-spec.test.ts` passes.
  - Existing tests in `packages/core` pass (ensuring no regression in `HeliosOptions`).
  - `HeliosConfig` can be `JSON.stringify`-ed and `JSON.parse`-d back successfully.
- **Edge Cases**:
  - Verify `validateHeliosConfig` throws on invalid types.
  - Verify `HeliosOptions` still accepts `driver` and `ticker`.
