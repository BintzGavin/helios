import { describe, it, expect } from 'vitest';
import { signal, computed, effect } from './signals.js';

describe('Signals Optimization', () => {
  it('should run effect exactly once for diamond dependency graph', () => {
    // A -> B (Computed)
    // A -> C (Effect depends on A and B)

    const root = signal(0);
    const derived = computed(() => root.value * 2);

    let runCount = 0;
    let observedRoot = 0;
    let observedDerived = 0;

    const dispose = effect(() => {
      observedRoot = root.value;
      observedDerived = derived.value;
      runCount++;
    });

    expect(runCount).toBe(1); // Initial run
    expect(observedRoot).toBe(0);
    expect(observedDerived).toBe(0);

    // Update root
    root.value = 1;

    // derived should update to 2.
    // Effect should see root=1, derived=2.
    // Effect should run exactly once more.

    expect(observedRoot).toBe(1);
    expect(observedDerived).toBe(2);
    expect(runCount).toBe(2); // Initial (1) + Update (1) = 2

    dispose();
  });

  it('should run effect when only computed dependency changes', () => {
    // A -> B (Computed)
    // B -> C (Effect depends only on B)

    const root = signal(0);
    const derived = computed(() => root.value * 2);

    let runCount = 0;

    const dispose = effect(() => {
      const val = derived.value;
      runCount++;
    });

    expect(runCount).toBe(1);

    root.value = 1; // derived -> 2
    expect(runCount).toBe(2);

    dispose();
  });
});
