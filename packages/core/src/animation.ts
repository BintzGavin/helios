import { HeliosError, HeliosErrorCode } from './errors.js';

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
    throw new HeliosError(
      HeliosErrorCode.INVALID_INPUT_RANGE,
      'interpolate(): inputRange and outputRange must have the same length',
      'Ensure input and output arrays have the same number of elements.'
    );
  }
  if (inputRange.length < 2) {
    throw new HeliosError(
      HeliosErrorCode.INVALID_INPUT_RANGE,
      'interpolate(): inputRange must have at least 2 elements',
      'Provide at least 2 values for interpolation.'
    );
  }

  // Validate strictly sorted
  for (let i = 0; i < inputRange.length - 1; i++) {
    if (inputRange[i] >= inputRange[i + 1]) {
      throw new HeliosError(
        HeliosErrorCode.UNSORTED_INPUT_RANGE,
        `interpolate(): inputRange must be strictly monotonically increasing. Found ${inputRange[i]} >= ${inputRange[i + 1]}`,
        'Sort the input range in ascending order.'
      );
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

export interface SpringConfig {
  mass?: number;      // default: 1
  stiffness?: number; // default: 100
  damping?: number;   // default: 10
  overshootClamping?: boolean; // default: false
}

export interface SpringOptions {
  frame: number;
  fps: number;
  config?: SpringConfig;
  from?: number; // default: 0
  to?: number;   // default: 1
  /**
   * Optional duration hint.
   * Note: Physics simulations are time-based and do not have a fixed duration.
   * This property is currently ignored by the spring function.
   */
  durationInFrames?: number;
}

/**
 * Calculates the value of a spring physics simulation at a specific frame.
 * Simulates a Damped Harmonic Oscillator.
 */
export function spring(options: SpringOptions): number {
  const {
    frame,
    fps,
    config = {},
    from = 0,
    to = 1
  } = options;

  const t = frame / fps;
  if (t <= 0) return from;

  const { mass = 1, stiffness = 100, damping = 10, overshootClamping = false } = config;

  if (mass <= 0) throw new HeliosError(HeliosErrorCode.INVALID_SPRING_CONFIG, "Spring mass must be > 0", "Set mass to a positive number.");
  if (stiffness <= 0) throw new HeliosError(HeliosErrorCode.INVALID_SPRING_CONFIG, "Spring stiffness must be > 0", "Set stiffness to a positive number.");

  const omega_n = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));

  let value: number;

  if (zeta === 1) {
    // Critically Damped
    value = to - Math.exp(-omega_n * t) * (to - from) * (1 + omega_n * t);
  } else if (zeta < 1) {
    // Underdamped
    const omega_d = omega_n * Math.sqrt(1 - zeta * zeta);
    value = to - Math.exp(-zeta * omega_n * t) * (to - from) * (
      Math.cos(omega_d * t) + (zeta / Math.sqrt(1 - zeta * zeta)) * Math.sin(omega_d * t)
    );
  } else {
    // Overdamped
    const root1 = -omega_n * (zeta - Math.sqrt(zeta * zeta - 1));
    const root2 = -omega_n * (zeta + Math.sqrt(zeta * zeta - 1));

    const C1 = (from - to) * root2 / (root2 - root1);
    const C2 = (from - to) * root1 / (root1 - root2);

    value = to + C1 * Math.exp(root1 * t) + C2 * Math.exp(root2 * t);
  }

  if (overshootClamping) {
    if (to > from && value > to) return to;
    if (to < from && value < to) return to;
  }

  return value;
}
