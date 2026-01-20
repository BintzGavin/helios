## 1. Context & Goal
- **Objective**: Implement the "Dual-Path Architecture" by refactoring the Renderer to use the Strategy Pattern, allowing distinct "Canvas Mode" and "DOM Mode" rendering paths.
- **Source**: Derived from README (Dual-Path Architecture) and User Prompt ("Architecture: You MUST maintain a separation between 'Canvas Mode' and 'DOM Mode' using separate strategy files").

## 2. File Inventory
- **Create**:
    - `packages/renderer/src/strategies/RenderStrategy.ts`
    - `packages/renderer/src/strategies/CanvasStrategy.ts`
    - `packages/renderer/src/strategies/DomStrategy.ts`
- **Modify**:
    - `packages/renderer/src/index.ts`

## 3. Implementation Spec
- **Architecture**:
    - Define a `RenderStrategy` interface with a `capture(page: Page, frameTime: number): Promise<Buffer>` method.
    - Implement `CanvasStrategy` using the existing `canvas.toDataURL` logic.
    - Implement `DomStrategy` using `page.screenshot` for DOM-based animations.
    - Update `Renderer` to accept a render mode (defaulting to 'canvas') and instantiate the appropriate strategy.
- **Pseudo-Code**:
    ```typescript
    interface RenderStrategy {
        capture(page: Page, frameTime: number): Promise<Buffer>;
    }

    class CanvasStrategy implements RenderStrategy {
        async capture(page, time) {
            // ... existing toDataURL logic ...
        }
    }

    class DomStrategy implements RenderStrategy {
        async capture(page, time) {
             // set time
             // page.screenshot()
        }
    }
    ```
- **Public API Changes**:
    - `RendererOptions` will add an optional `mode: 'canvas' | 'dom'` property.

## 4. Test Plan
- **Verification**:
    - Run the existing canvas example using the refactored renderer to ensure no regression: `npm run render:canvas-example`.
    - (Ideally) Create a simple DOM-based test case, but for now verifying the refactor works for canvas is critical.
- **Success Criteria**:
    - The `npm run render:canvas-example` command successfully generates a video file.
