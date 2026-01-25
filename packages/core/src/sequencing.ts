export interface SequenceOptions {
  frame: number;
  from: number;
  durationInFrames?: number;
}

export interface SequenceResult {
  localFrame: number;
  relativeFrame: number; // Same as localFrame, alias for clarity
  progress: number; // 0 to 1
  isActive: boolean; // true if within duration (or infinite if no duration)
}

/**
 * Calculates the local time and progress of a sequence relative to a start frame.
 *
 * @param options Configuration for the sequence
 * @returns The calculated sequence state
 */
export function sequence(options: SequenceOptions): SequenceResult {
  const { frame, from, durationInFrames } = options;
  const localFrame = frame - from;
  const relativeFrame = localFrame;

  let isActive = false;
  let progress = 0;

  if (durationInFrames === undefined) {
    isActive = localFrame >= 0;
    progress = 0;
  } else {
    // Note: Use < durationInFrames to match standard array/frame indexing (0 to duration-1)
    isActive = localFrame >= 0 && localFrame < durationInFrames;

    if (localFrame < 0) {
      progress = 0;
    } else if (localFrame >= durationInFrames) {
      progress = 1;
    } else {
      progress = durationInFrames > 0 ? localFrame / durationInFrames : 0;
    }
  }

  return {
    localFrame,
    relativeFrame,
    progress,
    isActive,
  };
}

export interface SeriesItem {
  durationInFrames: number;
  offset?: number;
}

/**
 * Calculates a sequence of start frames ('from') for a list of items,
 * placing them one after another based on their duration.
 *
 * @param items Array of items with durationInFrames
 * @param startFrame Optional starting frame for the sequence (default: 0)
 * @returns Array of items with 'from' property added
 */
export function series<T extends SeriesItem>(items: T[], startFrame = 0): (T & { from: number })[] {
  let current = startFrame;
  return items.map((item) => {
    // Offset shifts the start time of THIS item relative to the end of the PREVIOUS item
    const from = current + (item.offset || 0);

    // The next item starts after this one ends
    current = from + item.durationInFrames;

    return { ...item, from };
  });
}
