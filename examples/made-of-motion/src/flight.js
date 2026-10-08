// The seven flying letters of the ending (port of flight.rs), computed in f32 like the
// original: the letters' angles accumulate over the shot, so rounding matters.

import { animate, Easing, f, timeline } from './anim.js';
import { LETTERS } from './captures.js';

export function letterFlights() {
  // Three frames to assemble, four to pull the camera back: a cut-speed move.
  const gather = timeline([{ at: 2.541667, end: 2.666667, from: 0, to: 1, easing: Easing.EaseIn }]);
  const target = [-229, -181, -124, -47.5, 66, 167.5, 226];
  const path = (index, i) => {
    // Replay the measured high-energy flight in independent phases; the three extra
    // letters use reflected versions of those trajectories.
    let phase = f(f(f(index) * f(f(0.80) + f(f(i) * f(0.025)))) + f(f(i) * f(3.1)));
    phase = f(((phase % 52) + 52) % 52);
    phase = phase <= 26 ? phase : f(52 - phase);
    const sample = f(3 + phase);
    const a = Math.floor(sample);
    const b = Math.min(a + 1, LETTERS.length - 1);
    const fr = f(sample - Math.floor(sample));
    const aa = LETTERS[a][i % 4].map(f);
    const bb = LETTERS[b][i % 4].map(f);
    let x = f(aa[0] + f(f(bb[0] - aa[0]) * fr));
    let y = f(aa[1] + f(f(bb[1] - aa[1]) * fr));
    if (i >= 4) {
      x = f(1440 - x);
      y = f(1080 - y);
    }
    // Softly fit the few off-canvas source excursions into this edit.
    return [
      f(60 + f(Math.min(1440, Math.max(0, x)) * f(1320 / 1440))),
      f(85 + f(Math.min(1080, Math.max(0, y)) * f(910 / 1080))),
    ];
  };
  const angles = new Array(7).fill(0);
  const letters = [];
  for (let index = 0; index < 76; index++) {
    const g = animate(gather, f(f(index) / 24));
    letters.push(Array.from({ length: 7 }, (_, i) => {
      const [x, y] = path(index, i);
      const [px, py] = path(f(index - 0.5), i);
      const speed = f(f(Math.sqrt(f(f(f(x - px) ** 2) + f(f(y - py) ** 2)))) * 2);
      const direction = i % 2 === 0 ? 1 : -1;
      angles[i] = f(angles[i] + f(direction * f(f(speed * f(0.34)) + f(3.1))));
      const margin = f(52 + f(f(f(f(270 * 4) * g) * f(1 - g))));
      const gx = f(f(x * f(1 - g)) + f(f(720 + f(target[i] * f(2.8))) * g));
      return {
        position: [
          Math.min(f(1440 - margin), Math.max(margin, gx)),
          f(f(y * f(1 - g)) + f(f(540 + f(39 * f(2.8))) * g)),
        ],
        angle: f(angles[i] * f(1 - g)),
        scale: f(f(f(f(1.05) + Math.min(f(speed / 170), f(0.65))) * f(1 - g)) + f(f(f(f(194) / 54) * f(2.8)) * g)),
      };
    }));
  }
  return letters;
}
