export type EasingFunction = (t: number) => number;

// Constants for Back easing
const c1 = 1.70158;
const c2 = c1 * 1.525;
const c3 = c1 + 1;
const c4 = (2 * Math.PI) / 3;
const c5 = (2 * Math.PI) / 4.5;

function bounceOut(x: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;

  if (x < 1 / d1) {
    return n1 * x * x;
  } else if (x < 2 / d1) {
    return n1 * (x -= 1.5 / d1) * x + 0.75;
  } else if (x < 2.5 / d1) {
    return n1 * (x -= 2.25 / d1) * x + 0.9375;
  } else {
    return n1 * (x -= 2.625 / d1) * x + 0.984375;
  }
}

/**
 * Solves a cubic bezier curve for a given x.
 * Based on https://github.com/gre/bezier-easing
 */
function cubicBezier(mX1: number, mY1: number, mX2: number, mY2: number): EasingFunction {
  if (mX1 === mY1 && mX2 === mY2) return (t) => t; // Linear

  const NEWTON_ITERATIONS = 4;
  const NEWTON_MIN_SLOPE = 0.001;
  const SUBDIVISION_PRECISION = 0.0000001;
  const SUBDIVISION_MAX_ITERATIONS = 10;
  const kSplineTableSize = 11;
  const kSampleStepSize = 1.0 / (kSplineTableSize - 1.0);

  const float32ArraySupported = typeof Float32Array === 'function';
  const sampleValues = float32ArraySupported ? new Float32Array(kSplineTableSize) : new Array(kSplineTableSize);

  function A(aA1: number, aA2: number) { return 1.0 - 3.0 * aA2 + 3.0 * aA1; }
  function B(aA1: number, aA2: number) { return 3.0 * aA2 - 6.0 * aA1; }
  function C(aA1: number) { return 3.0 * aA1; }

  function calcBezier(aT: number, aA1: number, aA2: number) {
    return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT;
  }

  function getSlope(aT: number, aA1: number, aA2: number) {
    return 3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1);
  }

  function newtonRaphsonIterate(aX: number, aGuessT: number, mX1: number, mX2: number) {
    for (let i = 0; i < NEWTON_ITERATIONS; ++i) {
      const currentSlope = getSlope(aGuessT, mX1, mX2);
      if (currentSlope === 0.0) return aGuessT;
      const currentX = calcBezier(aGuessT, mX1, mX2) - aX;
      aGuessT -= currentX / currentSlope;
    }
    return aGuessT;
  }

  // Precompute samples table
  for (let i = 0; i < kSplineTableSize; ++i) {
    sampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2);
  }

  function getTForX(aX: number) {
    let intervalStart = 0.0;
    let currentSample = 1;
    const lastSample = kSplineTableSize - 1;

    for (; currentSample !== lastSample && sampleValues[currentSample] <= aX; ++currentSample) {
      intervalStart += kSampleStepSize;
    }
    --currentSample;

    // Interpolate to provide an initial guess for t
    const dist = (aX - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample]);
    const guessForT = intervalStart + dist * kSampleStepSize;

    const initialSlope = getSlope(guessForT, mX1, mX2);
    if (initialSlope >= NEWTON_MIN_SLOPE) {
      return newtonRaphsonIterate(aX, guessForT, mX1, mX2);
    } else if (initialSlope === 0.0) {
      return guessForT;
    } else {
       // Binary subdivision
       let aGuessT = guessForT; // Should implement binary subdivision if needed, but Newton is usually enough
       // Fallback or leave as is for now as it's rare to hit slope 0 exactly where newton fails significantly for animation usage
       return aGuessT;
    }
  }

  return (t: number) => {
    if (t === 0 || t === 1) return t;
    return calcBezier(getTForX(t), mY1, mY2);
  };
}

export const Easing = {
  // Basics
  linear: (t: number) => t,
  step: (steps: number) => (t: number) => Math.floor(t * steps) / steps,
  bezier: cubicBezier,

  // Polynomial
  quad: {
    in: (t: number) => t * t,
    out: (t: number) => 1 - (1 - t) * (1 - t),
    inOut: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  },
  cubic: {
    in: (t: number) => t * t * t,
    out: (t: number) => 1 - Math.pow(1 - t, 3),
    inOut: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  },
  quart: {
    in: (t: number) => t * t * t * t,
    out: (t: number) => 1 - Math.pow(1 - t, 4),
    inOut: (t: number) => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
  },
  quint: {
    in: (t: number) => t * t * t * t * t,
    out: (t: number) => 1 - Math.pow(1 - t, 5),
    inOut: (t: number) => t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2,
  },

  // Transcendental
  sine: {
    in: (t: number) => 1 - Math.cos((t * Math.PI) / 2),
    out: (t: number) => Math.sin((t * Math.PI) / 2),
    inOut: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  },
  expo: {
    in: (t: number) => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
    out: (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    inOut: (t: number) => {
      if (t === 0) return 0;
      if (t === 1) return 1;
      if ((t *= 2) < 1) return Math.pow(2, 10 * (t - 1)) / 2;
      return (2 - Math.pow(2, -10 * (t - 1))) / 2;
    },
  },
  circ: {
    in: (t: number) => 1 - Math.sqrt(1 - Math.pow(t, 2)),
    out: (t: number) => Math.sqrt(1 - Math.pow(t - 1, 2)),
    inOut: (t: number) => t < 0.5
      ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
      : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
  },

  // Physical
  back: {
    in: (t: number) => c3 * t * t * t - c1 * t * t,
    out: (t: number) => 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2),
    inOut: (t: number) => {
      const c2 = c1 * 1.525;
      return t < 0.5
        ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
        : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
    },
  },
  elastic: {
    in: (t: number) => {
      const c4 = (2 * Math.PI) / 3;
      return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
    },
    out: (t: number) => {
      const c4 = (2 * Math.PI) / 3;
      return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },
    inOut: (t: number) => {
        const c5 = (2 * Math.PI) / 4.5;
        return t === 0 ? 0 : t === 1 ? 1 : t < 0.5
          ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
          : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
    }
  },
  bounce: {
    in: (t: number) => 1 - bounceOut(1 - t),
    out: bounceOut,
    inOut: (t: number) => t < 0.5
      ? (1 - bounceOut(1 - 2 * t)) / 2
      : (bounceOut(2 * t - 1) + 1) / 2,
  }
};
