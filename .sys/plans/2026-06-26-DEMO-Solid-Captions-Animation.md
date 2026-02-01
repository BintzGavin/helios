# Plan: SolidJS Captions Animation Example

## 1. Context & Goal
- **Objective**: Create a new example `examples/solid-captions-animation` that demonstrates how to use Helios captions (SRT) with SolidJS.
- **Trigger**: Vision Gap - The "Captions" feature is demonstrated in React, Vue, and Svelte, but missing in SolidJS.
- **Impact**: achieves 100% framework parity for the Captions feature, ensuring SolidJS users have a reference implementation.

## 2. File Inventory
- **Create**:
  - `examples/solid-captions-animation/package.json`: Dependency config.
  - `examples/solid-captions-animation/vite.config.js`: Build config with aliases.
  - `examples/solid-captions-animation/composition.html`: Entry point.
  - `examples/solid-captions-animation/src/index.jsx`: Application mount point.
  - `examples/solid-captions-animation/src/App.jsx`: Main composition component.
  - `examples/solid-captions-animation/src/CaptionOverlay.jsx`: Caption rendering component.
  - `examples/solid-captions-animation/src/hooks/createCaptions.js`: Reactive hook for Helios captions.
- **Modify**:
  - `vite.build-example.config.js`: Update `solidPlugin` include regex to recognize the new example.

## 3. Implementation Spec

### Architecture
- **Framework**: SolidJS + Vite.
- **State Management**: Use `createSignal` and `onCleanup` to bridge Helios's callback-based subscription system to Solid's reactive primitives.
- **Pattern**: Implement a `createCaptions` hook that mimics the React `useCaptions` hook, providing a reactive list of active cues.

### Pseudo-Code

#### `src/hooks/createCaptions.js`
```javascript
export function createCaptions(helios) {
  // 1. Create signal initialized with helios.activeCaptions.value
  // 2. Subscribe to helios
  //    - On update: setSignal(state.activeCaptions)
  // 3. onCleanup: unsubscribe
  // 4. Return accessor
}
```

#### `src/App.jsx`
```javascript
// 1. Initialize Helios with SRT data
// 2. Call helios.bindToDocumentTimeline() (Critical for E2E)
// 3. Render <CaptionOverlay helios={helios} />
```

#### `vite.build-example.config.js`
- Update `solidPlugin.include` regex to match `solid-captions-animation`.
- Update `react.exclude` regex if necessary (though it seems to use the same pattern).

## 4. Test Plan
- **Verification**: Run `npm run build:examples`.
- **Success Criteria**:
  - The build process completes without error.
  - The `output/example-build/examples/solid-captions-animation` directory contains built assets (index.html, assets/).
- **Edge Cases**: Ensure `helios.bindToDocumentTimeline()` is called so the example works in the E2E pipeline (which may be verified in a later task).
