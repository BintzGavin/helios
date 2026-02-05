# Plan: Update Examples Documentation

## 1. Context & Goal
- **Objective**: Synchronize `examples/README.md` with the current state of the repository to document all available examples.
- **Trigger**: Discovery that `examples/README.md` is missing ~20 recent examples (D3, Pixi, Lottie, Audio Viz, Svelte Runes, Solid DOM) which are present in the codebase and internal docs.
- **Impact**: Improves discoverability of features for users and AI agents, ensuring the "Vision" of a rich example library is accurately represented and accessible.

## 2. File Inventory
- **Modify**: `examples/README.md` (Update list of examples)
- **Read-Only**: `.sys/llmdocs/context-demo.md` (Reference source)

## 3. Implementation Spec
- **Source of Truth**: Use `.sys/llmdocs/context-demo.md` as the primary baseline, as it is currently more up-to-date than the public README.
- **Verification**: Cross-reference with the actual `examples/` directory structure to ensure no folder is missed.
- **Structure**: Maintain the existing categories:
  - Vanilla JS
  - React
  - Vue
  - Svelte
  - Solid
  - Integrations
  - Advanced & Complete Compositions
  - Core Concepts
- **New Entries**: Add missing entries including but not limited to:
  - **D3**: `react-d3-animation`, `vue-d3-animation`, `svelte-d3-animation`
  - **Pixi**: `react-pixi-animation`, `vue-pixi-animation`, `svelte-pixi-animation`, `solid-pixi-animation`
  - **Lottie**: `react-lottie-animation`, `vue-lottie-animation`, `svelte-lottie-animation`, `solid-lottie-animation`
  - **Audio Viz**: `solid-audio-visualization`, `svelte-audio-visualization`
  - **Framework Specific**: `solid-dom-animation`, `svelte-runes-animation`
  - **Demos**: `react-components-demo`
- **Descriptions**: Ensure brief, consistent descriptions for all new entries, matching the existing style.

## 4. Test Plan
- **Verification**: `cat examples/README.md`
- **Success Criteria**:
  - The file lists all relevant directories found in `examples/`.
  - Sections are correctly organized by framework/topic.
  - Links point to valid relative paths (e.g., `./react-d3-animation/`).
