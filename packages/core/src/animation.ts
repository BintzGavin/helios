export type ExtrapolateType = 'extend' | 'clamp' | 'identity';

export interface InterpolateOptions {
  extrapolateLeft?: ExtrapolateType;
  extrapolateRight?: ExtrapolateType;
  easing?: (t: number) => number;
}

/**
 * Maps an input value within a range to an output value.
 * Supports linear interpolation, easing, and extrapolation.
 *
 * @param input The value to interpolate
 * @param inputRange Array of input values (must be strictly monotonically increasing)
 * @param outputRange Array of output values (must match length of inputRange)
 * @param options Configuration for extrapolation and easing
 */
export function interpolate(
  input: number,
  inputRange: number[],
  outputRange: number[],
  options?: InterpolateOptions
): number {
  const { extrapolateLeft = 'extend', extrapolateRight = 'extend', easing } = options || {};

  if (inputRange.length !== outputRange.length) {
    throw new Error('interpolate(): inputRange and outputRange must have the same length');
  }
  if (inputRange.length < 2) {
    throw new Error('interpolate(): inputRange must have at least 2 elements');
  }

  // Validate strictly sorted
  for (let i = 0; i < inputRange.length - 1; i++) {
    if (inputRange[i] >= inputRange[i + 1]) {
      throw new Error(`interpolate(): inputRange must be strictly monotonically increasing. Found ${inputRange[i]} >= ${inputRange[i + 1]}`);
    }
  }

  // Extrapolate Left
  if (input < inputRange[0]) {
    if (extrapolateLeft === 'identity') return input;
    if (extrapolateLeft === 'clamp') return outputRange[0];
    if (extrapolateLeft === 'extend') {
      return interpolateLinear(input, inputRange[0], inputRange[1], outputRange[0], outputRange[1]);
    }
  }

  // Extrapolate Right
  const lastIndex = inputRange.length - 1;
  if (input > inputRange[lastIndex]) {
    if (extrapolateRight === 'identity') return input;
    if (extrapolateRight === 'clamp') return outputRange[outputRange.length - 1];
    if (extrapolateRight === 'extend') {
      return interpolateLinear(
        input,
        inputRange[lastIndex - 1],
        inputRange[lastIndex],
        outputRange[lastIndex - 1],
        outputRange[lastIndex]
      );
    }
  }

  // Find segment
  for (let i = 0; i < inputRange.length - 1; i++) {
    if (input <= inputRange[i + 1]) {
      const inMin = inputRange[i];
      const inMax = inputRange[i + 1];
      const outMin = outputRange[i];
      const outMax = outputRange[i + 1];

      let ratio = (input - inMin) / (inMax - inMin);
      if (easing) {
        ratio = easing(ratio);
      }

      return outMin + ratio * (outMax - outMin);
    }
  }

  return input; // Should be unreachable
}

function interpolateLinear(input: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  const ratio = (input - inMin) / (inMax - inMin);
  return outMin + ratio * (outMax - outMin);
}
