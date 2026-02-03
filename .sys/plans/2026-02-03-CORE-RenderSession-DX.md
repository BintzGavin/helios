# CORE: Enhance RenderSession and Update Docs

#### 1. Context & Goal
- **Objective**: Integrate `RenderSession` into the `Helios` class for improved Developer Experience (DX) and update the README to document all current features.
- **Trigger**: The `RenderSession` class is a hidden primitive requiring manual range calculation, and the `README.md` is significantly outdated, missing documentation for Audio, Captions, and Rendering.
- **Impact**: Unlocks easier headless rendering workflows and ensures consumers understand the full capabilities of the engine.

#### 2. File Inventory
- **Modify**: `packages/core/src/render-session.ts` (Make options optional, implement default logic)
- **Modify**: `packages/core/src/Helios.ts` (Add `createRenderSession` factory method)
- **Modify**: `packages/core/src/render-session.test.ts` (Add tests for defaults and factory)
- **Modify**: `packages/core/README.md` (Add missing feature documentation)
- **Read-Only**: `packages/core/src/index.ts` (Ensure exports remain correct)

#### 3. Implementation Spec
- **Architecture**:
  - `RenderSession` will use "smart defaults" by inspecting the `Helios` instance state if options are not provided.
  - `Helios` will act as a factory for `RenderSession`, making the feature discoverable via autocomplete.

- **Pseudo-Code**:
  - **`packages/core/src/render-session.ts`**:
    ```typescript
    interface RenderSessionOptions {
      startFrame?: number; // Now optional
      endFrame?: number;   // Now optional
      abortSignal?: AbortSignal;
    }

    class RenderSession {
      constructor(helios, options) {
        // Default Logic
        const range = helios.playbackRange.peek();
        const start = options?.startFrame ?? range?.[0] ?? 0;
        const end = options?.endFrame ?? range?.[1] ?? (helios.duration.peek() * helios.fps.peek());

        // ... (rest of implementation)
      }
    }
    ```
  - **`packages/core/src/Helios.ts`**:
    ```typescript
    import { RenderSession, RenderSessionOptions } from './render-session.js';

    class Helios {
      // ...
      public createRenderSession(options?: RenderSessionOptions): RenderSession {
        return new RenderSession(this, options || {});
      }
    }
    ```

- **Public API Changes**:
  - `RenderSessionOptions`: `startFrame` and `endFrame` are now optional.
  - `Helios`: New method `createRenderSession(options?)`.

- **Documentation Updates**:
  - **README.md**: Add sections for:
    - **Render Session**: Show `helios.createRenderSession()`.
    - **Audio Control**: `volume`, `muted`, `setAudioTrackVolume`.
    - **Captions**: `setCaptions`, `activeCaptions`.
    - **Markers**: `addMarker`, `seekToMarker`.
    - **Timeline Sync**: `bindTo`, `bindToDocumentTimeline`.

#### 4. Test Plan
- **Verification**: Run `npm test -w packages/core`
- **Success Criteria**:
  - `packages/core/src/render-session.test.ts` passes with new test cases for default inference.
  - `Helios` instance correctly creates a `RenderSession`.
  - README correctly documents the new API.
- **Edge Cases**:
  - `playbackRange` is null -> defaults to 0..totalFrames.
  - `playbackRange` is set -> defaults to range.
  - Options provided -> overrides defaults.
