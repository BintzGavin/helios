#### 1. Context & Goal
- **Objective**: Implement a Vitest performance benchmark for the `AudioFader` component to ensure efficient audio processing loops.
- **Trigger**: Gravitational equilibrium reached; falling back to improving test coverage and performance benchmarks per domain journal.
- **Impact**: Ensures that the `requestAnimationFrame` loop in `AudioFader` remains performant during continuous audio fading over multiple elements, preventing main-thread blocking.

#### 2. File Inventory
- **Create**: `packages/player/src/features/audio-fader.bench.ts` (Vitest benchmark for `AudioFader`)
- **Modify**: `packages/player/package.json` (Add `"bench": "vitest bench"` script to `scripts` to enable running benchmarks)
- **Read-Only**: `packages/player/src/features/audio-fader.ts` (To understand the `private loop = () => {}` structure and `data-helios-fade-in` logic)

#### 3. Implementation Spec
- **Architecture**: Using Vitest's `bench` functionality to simulate a large number of `audio` elements connected to the `AudioFader`, measuring the performance of the `loop` method calculating fade gains per frame.
- **Pseudo-Code**:
  - Mock `SharedAudioContextManager` and `requestAnimationFrame`.
  - In a `beforeAll` block, setup a mock DOM with hundreds of `audio` elements, each with `data-helios-fade-in` and `data-helios-fade-out` attributes.
  - Connect the elements to an `AudioFader` instance using `fader.connect(doc)`.
  - In the `bench` task, trigger the internal `loop` calculations by invoking `fader.enable()` and mocking RAF execution to measure time per frame.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `cd packages/player && npm install --no-save --workspaces=false && npm run bench`
- **Success Criteria**: Vitest outputs benchmark results showing the ops/sec for `AudioFader` processing without failing.
- **Edge Cases**: Ensure the mock setup does not pollute the benchmark loop execution time. Setup must be done in `beforeAll`.