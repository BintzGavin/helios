import { HeliosError, HeliosErrorCode } from './errors.js';
import { InterpolateOptions } from './animation.js';

export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Parses a color string into an RGBA object.
 * Supports:
 * - Hex: #RGB, #RGBA, #RRGGBB, #RRGGBBAA
 * - RGB/RGBA: rgb(r, g, b), rgba(r, g, b, a)
 * - HSL/HSLA: hsl(h, s%, l%), hsla(h, s%, l%, a)
 */
export function parseColor(color: string): RgbaColor {
  const trimmed = color.trim();

  if (trimmed.startsWith('#')) {
    return parseHex(trimmed);
  } else if (trimmed.startsWith('rgb')) {
    return parseRgb(trimmed);
  } else if (trimmed.startsWith('hsl')) {
    return parseHsl(trimmed);
  }

  throw new HeliosError(
    HeliosErrorCode.INVALID_COLOR_FORMAT,
    `Unsupported color format: ${color}`,
    "Use Hex, RGB/RGBA, or HSL/HSLA formats."
  );
}

function parseHex(hex: string): RgbaColor {
  const cleanHex = hex.slice(1);
  let r = 0, g = 0, b = 0, a = 1;

  if (cleanHex.length === 3) {
    // #RGB
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length === 4) {
    // #RGBA
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
    a = parseInt(cleanHex[3] + cleanHex[3], 16) / 255;
  } else if (cleanHex.length === 6) {
    // #RRGGBB
    r = parseInt(cleanHex.slice(0, 2), 16);
    g = parseInt(cleanHex.slice(2, 4), 16);
    b = parseInt(cleanHex.slice(4, 6), 16);
  } else if (cleanHex.length === 8) {
    // #RRGGBBAA
    r = parseInt(cleanHex.slice(0, 2), 16);
    g = parseInt(cleanHex.slice(2, 4), 16);
    b = parseInt(cleanHex.slice(4, 6), 16);
    a = parseInt(cleanHex.slice(6, 8), 16) / 255;
  } else {
    throw new HeliosError(
        HeliosErrorCode.INVALID_COLOR_FORMAT,
        `Invalid hex color: ${hex}`,
        "Hex colors must be 3, 4, 6, or 8 characters long."
    );
  }

  if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) {
      throw new HeliosError(HeliosErrorCode.INVALID_COLOR_FORMAT, `Invalid hex values in ${hex}`, "Check for non-hex characters.");
  }

  return { r, g, b, a };
}

function parseRgb(rgb: string): RgbaColor {
  const match = rgb.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?\)$/);
  if (!match) {
     throw new HeliosError(
        HeliosErrorCode.INVALID_COLOR_FORMAT,
        `Invalid RGB/RGBA color: ${rgb}`,
        "Format should be rgb(r, g, b) or rgba(r, g, b, a)."
    );
  }

  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10),
    a: match[4] !== undefined ? parseFloat(match[4]) : 1
  };
}

function parseHsl(hsl: string): RgbaColor {
    const match = hsl.match(/^hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(?:,\s*(\d*\.?\d+)\s*)?\)$/);
    if (!match) {
        throw new HeliosError(
            HeliosErrorCode.INVALID_COLOR_FORMAT,
            `Invalid HSL/HSLA color: ${hsl}`,
            "Format should be hsl(h, s%, l%) or hsla(h, s%, l%, a)."
        );
    }

    const h = parseInt(match[1], 10);
    const s = parseInt(match[2], 10) / 100;
    const l = parseInt(match[3], 10) / 100;
    const a = match[4] !== undefined ? parseFloat(match[4]) : 1;

    return hslToRgb(h, s, l, a);
}

function hslToRgb(h: number, s: number, l: number, a: number): RgbaColor {
    let r, g, b;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        r = hue2rgb(p, q, h / 360 + 1 / 3);
        g = hue2rgb(p, q, h / 360);
        b = hue2rgb(p, q, h / 360 - 1 / 3);
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
        a: a
    };
}

function rgbaToString(c: RgbaColor): string {
    return `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`;
}

/**
 * Interpolates between colors based on an input value.
 *
 * @param input The value to interpolate
 * @param inputRange Array of input values (must be strictly monotonically increasing)
 * @param outputRange Array of output color strings (must match length of inputRange)
 * @param options Configuration for extrapolation and easing
 */
export function interpolateColors(
  input: number,
  inputRange: number[],
  outputRange: string[],
  options?: InterpolateOptions
): string {
  const { extrapolateLeft = 'extend', extrapolateRight = 'extend', easing } = options || {};

  if (inputRange.length !== outputRange.length) {
    throw new HeliosError(
      HeliosErrorCode.INVALID_INPUT_RANGE,
      'interpolateColors(): inputRange and outputRange must have the same length',
      'Ensure input and output arrays have the same number of elements.'
    );
  }
  if (inputRange.length < 2) {
    throw new HeliosError(
      HeliosErrorCode.INVALID_INPUT_RANGE,
      'interpolateColors(): inputRange must have at least 2 elements',
      'Provide at least 2 values for interpolation.'
    );
  }

  // Validate strictly sorted
  for (let i = 0; i < inputRange.length - 1; i++) {
    if (inputRange[i] >= inputRange[i + 1]) {
      throw new HeliosError(
        HeliosErrorCode.UNSORTED_INPUT_RANGE,
        `interpolateColors(): inputRange must be strictly monotonically increasing. Found ${inputRange[i]} >= ${inputRange[i + 1]}`,
        'Sort the input range in ascending order.'
      );
    }
  }

  // Parse all output colors
  const parsedOutput = outputRange.map(parseColor);

  // Extrapolate Left
  if (input < inputRange[0]) {
    if (extrapolateLeft === 'clamp') return rgbaToString(parsedOutput[0]);
    // For 'extend' or 'identity', proceed to linear interpolation using the first segment
    return interpolateSegment(input, inputRange[0], inputRange[1], parsedOutput[0], parsedOutput[1]);
  }

  // Extrapolate Right
  const lastIndex = inputRange.length - 1;
  if (input > inputRange[lastIndex]) {
    if (extrapolateRight === 'clamp') return rgbaToString(parsedOutput[lastIndex]);
    // For 'extend' or 'identity', proceed to linear interpolation using the last segment
    return interpolateSegment(
        input,
        inputRange[lastIndex - 1],
        inputRange[lastIndex],
        parsedOutput[lastIndex - 1],
        parsedOutput[lastIndex]
    );
  }

  // Find segment
  for (let i = 0; i < inputRange.length - 1; i++) {
    if (input <= inputRange[i + 1]) {
      const inMin = inputRange[i];
      const inMax = inputRange[i + 1];
      const outMin = parsedOutput[i];
      const outMax = parsedOutput[i + 1];

      let ratio = (input - inMin) / (inMax - inMin);
      if (easing) {
        ratio = easing(ratio);
      }

      return interpolateRgba(ratio, outMin, outMax);
    }
  }

  return rgbaToString(parsedOutput[0]); // Should be unreachable
}

function interpolateSegment(input: number, inMin: number, inMax: number, outMin: RgbaColor, outMax: RgbaColor): string {
    const ratio = (input - inMin) / (inMax - inMin);
    return interpolateRgba(ratio, outMin, outMax);
}

function interpolateRgba(ratio: number, c1: RgbaColor, c2: RgbaColor): string {
    const r = Math.round(c1.r + ratio * (c2.r - c1.r));
    const g = Math.round(c1.g + ratio * (c2.g - c1.g));
    const b = Math.round(c1.b + ratio * (c2.b - c1.b));
    const a = c1.a + ratio * (c2.a - c1.a);

    const safeR = Math.max(0, Math.min(255, r));
    const safeG = Math.max(0, Math.min(255, g));
    const safeB = Math.max(0, Math.min(255, b));
    const safeA = Math.max(0, Math.min(1, a));

    return `rgba(${safeR}, ${safeG}, ${safeB}, ${safeA})`;
}
