# 📋 Plan: React D3 Animation Example

#### 1. Context & Goal
- **Objective**: Create a `react-d3-animation` example to demonstrate D3.js integration with React.
- **Trigger**: Parity gap identified; `vue-d3-animation` and `d3-animation` (vanilla) exist, but React + D3 is a common request and currently missing.
- **Impact**: Unlocks a clear reference implementation for users wanting to build data visualizations with React and Helios, demonstrating the imperative-inside-declarative pattern.

#### 2. File Inventory
- **Create**: `examples/react-d3-animation/composition.html` (Entry point pointing to `src/main.jsx`)
- **Create**: `examples/react-d3-animation/package.json` (Dependencies: `react`, `react-dom`, `d3`, `@helios-project/core`)
- **Create**: `examples/react-d3-animation/src/main.jsx` (Mounts `App`)
- **Create**: `examples/react-d3-animation/src/App.jsx` (Main component)
- **Create**: `examples/react-d3-animation/src/data.js` (Data series)

#### 3. Implementation Spec
- **Architecture**:
    - Use `vite` for bundling (via root config).
    - Use `React` for the component tree.
    - Use `D3` for imperative DOM manipulation of the SVG.
    - Use `@helios-project/core` to drive the animation frame-by-frame.
- **Pseudo-Code**:
    - **App.jsx**:
        - Import `Helios` from `@helios-project/core`.
        - Import `d3`.
        - Import `DATA_SERIES`.
        - Instantiate `helios` with `duration=5`, `fps=30`.
        - Call `helios.bindToDocumentTimeline()`.
        - Component `App`:
            - `const svgRef = useRef(null)`
            - `useEffect`:
                - Select `svgRef.current` with D3.
                - Setup scales (x: band, y: linear).
                - Create axes groups.
                - Create bar group.
                - Define `update(time)` function:
                    - Calculate interpolation based on `time` and `DATA_SERIES`.
                    - Update bars using standard D3 enter/update/exit pattern.
                - Subscribe to `helios`: `helios.subscribe(({ currentFrame, fps }) => update(currentFrame/fps))`.
                - Return unsubscribe function.
            - Return `<svg ref={svgRef} />`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run build:examples`.
- **Success Criteria**:
    - Build completes without error.
    - `output/example-build/examples/react-d3-animation/composition.html` exists.
- **Edge Cases**: None specific.
