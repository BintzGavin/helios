# 2026-03-05-STUDIO-Audio-Waveform-Tests

#### 1. Context & Goal
- **Objective**: Add regression tests for `useAudioWaveform.ts` and `TimelineAudioTrack.tsx`.
- **Trigger**: The Studio domain's vision is complete, requiring fallback actions (regression tests) per `AGENTS.md` instructions.
- **Impact**: Improves confidence in the Audio Visualization feature by adding dedicated tests for the custom waveform hook and the canvas-based timeline track rendering.

#### 2. File Inventory
- **Create**:
  - `packages/studio/src/hooks/useAudioWaveform.test.ts`: Unit tests for the `useAudioWaveform` hook.
  - `packages/studio/src/components/TimelineAudioTrack.test.tsx`: Component tests for `TimelineAudioTrack`.
- **Modify**: None.
- **Read-Only**:
  - `packages/studio/src/hooks/useAudioWaveform.ts`
  - `packages/studio/src/components/TimelineAudioTrack.tsx`

#### 3. Implementation Spec
- **Architecture**:
  - **`useAudioWaveform.test.ts`**:
    - Mock `global.fetch` to return a dummy `ArrayBuffer`.
    - Mock `window.OfflineAudioContext` (and `webkitOfflineAudioContext`) to simulate audio decoding and return a dummy `AudioBuffer`.
    - Test that the hook correctly sets the `peaks` state by processing the mocked audio data.
    - Test caching behavior (calling the hook twice with the same URL should only trigger one fetch).
    - Test error handling (e.g., fetch failure or unsupported context).
  - **`TimelineAudioTrack.test.tsx`**:
    - Mock `useAudioWaveform` to return static peaks data.
    - Render `TimelineAudioTrack` with dummy props (e.g., `track`, `fps`, `height`, etc.).
    - Verify that a `<canvas>` element is rendered.
    - (Optional) Use `jest-canvas-mock` or mock the canvas context methods to verify that drawing operations (like `fillRect` or `clearRect`) are called when peaks are present.
- **Pseudo-Code**:
  ```typescript
  // useAudioWaveform.test.ts
  vi.mock('global.fetch', ...)
  vi.mock('window.OfflineAudioContext', ...)

  it('should fetch and decode audio', async () => {
    const { result } = renderHook(() => useAudioWaveform('test.mp3', 100));
    await waitFor(() => expect(result.current.peaks).toBeTruthy());
  });

  // TimelineAudioTrack.test.tsx
  vi.mock('../hooks/useAudioWaveform', () => ({
    useAudioWaveform: vi.fn().mockReturnValue({ peaks: new Float32Array([0.5, 0.8]), error: false })
  }));

  it('renders canvas', () => {
    const { container } = render(<TimelineAudioTrack track={...} ... />);
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });
  ```
- **Public API Changes**: None.
- **Dependencies**: The tests will require standard Vitest and React Testing Library utilities already present in `packages/studio`.

#### 4. Test Plan
- **Verification**: Run `npm test -w packages/studio` to execute the new test files.
- **Success Criteria**: All newly added tests in `useAudioWaveform.test.ts` and `TimelineAudioTrack.test.tsx` pass.
- **Edge Cases**: Ensure the hook handles network failures properly and the component does not crash if `peaks` data is empty or if `containerWidth` is zero.
