export interface TransitionOptions {
  easing?: (t: number) => number;
}

export interface CrossfadeResult {
  in: number;
  out: number;
}

/**
 * Calculates the progress of a transition.
 * Returns 0 before start, 0->1 during duration, 1 after.
 *
 * @param frame Current frame number
 * @param start Start frame number
 * @param duration Duration in frames
 * @param options Transition options (easing)
 */
export function transition(frame: number, start: number, duration: number, options?: TransitionOptions): number {
  if (frame < start) return 0;
  if (duration <= 0) return 1;

  const rawProgress = (frame - start) / duration;
  const progress = Math.max(0, Math.min(1, rawProgress));

  if (options?.easing) {
    return options.easing(progress);
  }

  return progress;
}

/**
 * Calculates values for a crossfade transition.
 * Useful for overlapping scenes.
 *
 * @param frame Current frame number
 * @param start Start frame number
 * @param duration Duration in frames
 * @param options Transition options (easing)
 */
export function crossfade(frame: number, start: number, duration: number, options?: TransitionOptions): CrossfadeResult {
  const p = transition(frame, start, duration, options);
  return {
    in: p,
    out: 1 - p
  };
}
