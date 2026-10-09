// Opening typography (port of opening.rs): source-timed rulers, lateral camera moves over
// oversized type, a cursor wipe, a scanline collapse and the blinking selection.

import { animate, Easing, Transform, transformTimeline } from './anim.js';
import { filterOrigin, label } from './painter.js';
import { textWidth } from './text.js';

export const QUESTION = 'how do you turn a few lines of code into a feeling?';

/** The question up to (not including) its `count`-th space. */
function prefix(question, count) {
  let seen = 0;
  for (let i = 0; i < question.length; i++) {
    if (question[i] === ' ' && ++seen === Math.max(count, 1)) return question.slice(0, i);
  }
  return question;
}

const pan = transformTimeline([
  { at: 0.208333, end: 0.25, from: Transform.translate(421, 0), to: Transform.translate(366, 0), easing: Easing.Linear },
  { at: 0.25, end: 0.291667, from: Transform.translate(366, 0), to: Transform.translate(-125, 0), easing: Easing.Linear },
  { at: 0.291667, end: 0.375, from: Transform.translate(-125, 0), to: Transform.translate(-176, 0), easing: Easing.EaseOut },
  { at: 0.375, end: 0.416667, from: Transform.translate(-176, 0), to: Transform.translate(-500, 0), easing: Easing.Linear },
  { at: 0.416667, end: 0.458333, from: Transform.translate(-500, 0), to: Transform.translate(-705, 0), easing: Easing.EaseOut },
  { at: 0.458333, end: 0.5, from: Transform.translate(-705, 0), to: Transform.translate(-722, 0), easing: Easing.EaseOut },
]);

const COLLAPSE = {
  14: [
    'M220 548 L223 516 L240 526 L230 536 L250 550 M281 528 L301 543 M330 526 L344 516 L335 541 M374 523 L365 541 M409 528 L427 544 M465 526 L454 544 M501 529 L511 545 M538 529 L551 543 M578 537 H777 M830 542 L853 530 M881 540 L899 523',
    'M0 0',
    5,
  ],
  15: [
    'M144 517 V540 H175 M212 540 H257 M286 540 H302 M329 540 H342 M377 540 H389 M408 540 H430 M500 540 H507 M549 540 H647 M709 540 L723 520 L739 540 H759',
    'M1100 448 H1115 M1107 490 V519 M1107 563 V586',
    4,
  ],
  16: [
    'M178 539 H218 M292 539 H303 M325 539 H394 M513 539 H557 M577 539 H587 M628 539 H638 M681 539 H691 M710 539 H733',
    'M905 470 V508 M905 551 V581',
    2.5,
  ],
  17: [
    'M114 539 H122 M143 539 H161 M221 539 H250 M276 539 H292 M320 539 H350 M377 539 H419 M454 539 H472 M491 539 H528 M571 539 H593 M641 539 H659 M686 539 H704',
    'M793 431 H825 M809 472 V494 M809 550 V590',
    4,
  ],
};

/** The fill bounds of an absolute M/L/H/V path, or null for a path without segments. */
function pathBounds(d) {
  const tokens = d.match(/[MLHV]|-?[\d.]+/g);
  let [x, y] = [0, 0];
  let box = null;
  let segments = 0;
  for (let i = 0; i < tokens.length;) {
    const cmd = tokens[i++];
    if (cmd === 'M' || cmd === 'L') [x, y] = [+tokens[i++], +tokens[i++]];
    else if (cmd === 'H') x = +tokens[i++];
    else if (cmd === 'V') y = +tokens[i++];
    if (cmd !== 'M') segments++;
    box = box ? [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)] : [x, y, x, y];
  }
  return segments ? box : null;
}

/**
 * `<filter x="-20%" y="-100%" width="140%" height="300%"><feGaussianBlur/></filter>` on the
 * collapse group: its region in canvas space, and the same filter as an SVG element for the
 * canvas (in the coordinates of the layer, which starts at the region's origin pixel). SVG
 * filters blur in linear light, and Chrome builds the same Skia filter graph as fframes.
 */
function focusFilter(n, paths, blur) {
  const [x0, y0, x1, y1] = paths.map(pathBounds).filter(Boolean)
    .reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]);
  const f = Math.fround;
  const [w, h] = [f(x1 - x0), f(y1 - y0)];
  const region = [f(x0 - f(w * f(0.2))), f(y0 - h)];
  region.push(f(region[0] + f(w * f(1.4))), f(region[1] + f(h * 3)));
  const id = `opening-focus-${n}`;
  if (!document.getElementById(id)) {
    let svg = document.getElementById('filters');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'filters';
      svg.setAttribute('width', '0');
      svg.setAttribute('height', '0');
      svg.style.position = 'absolute';
      document.body.appendChild(svg);
    }
    const [ox, oy] = filterOrigin(region);
    svg.insertAdjacentHTML('beforeend', `<filter id="${id}" filterUnits="userSpaceOnUse"
      x="${region[0] - ox}" y="${region[1] - oy}" width="${region[2] - region[0]}" height="${region[3] - region[1]}"
      color-interpolation-filters="linearRGB"><feGaussianBlur stdDeviation="${blur}"/></filter>`);
  }
  return { region, filter: `url(#${id})` };
}

// Four source exposures collapse the large lettering into broken scanlines before the
// small selection resolves. This is geometry, not footage.
function collapse(painter, c, n) {
  const [streaks, cursor, blur] = COLLAPSE[n];
  painter.filtered(c, { opacity: 0.82, ...focusFilter(n, [streaks, cursor], blur) }, (g) => {
    g.lineWidth = 13;
    g.lineCap = 'round';
    g.strokeStyle = '#211914';
    g.stroke(new Path2D(streaks));
    g.lineWidth = 12;
    g.lineCap = 'butt';
    g.strokeStyle = '#38241b';
    g.stroke(new Path2D(cursor));
  });
}

/**
 * The Question scene's type, for scene-local frame `n` (never called on frame 0).
 * `openingType` is the oversized type of frame 13: the question's first four words.
 */
export function drawOpening(painter, c, n, t, openingType, question = QUESTION) {
  if (n >= 18) {
    const count = Math.min(4 + Math.floor(((n - 13) * 8) / 32), 12);
    const copy = prefix(question, count);
    if ([18, 19, 20, 22].includes(n)) {
      const width = textWidth('Inter 24pt', 54, copy) - 1.25 * Math.max([...copy].length - 1, 0);
      const right = 106.25 + width + 24;
      // A typesetting selection that blinks off and on once, end caps outside the copy.
      painter.group(c, { opacity: n === 18 ? 0.40 : n === 22 ? 0.78 : 0.58 }, (g) => {
        g.strokeStyle = '#553424';
        g.lineWidth = 2.3;
        g.setLineDash([6, 7]);
        g.stroke(new Path2D(`M82 444 H${right} M82 628 H${right}`));
        g.setLineDash([]);
        g.strokeStyle = '#38241b';
        g.lineWidth = 6;
        g.stroke(new Path2D(
          `M72 444 H92 M82 444 V628 M72 628 H92 M${right - 10} 444 H${right + 10} M${right} 444 V628 M${right - 10} 628 H${right + 10}`,
        ));
      });
    }
    label(c, copy, 106.25, 554, 54, '#171611', false);
    return;
  }
  if (n >= 14) {
    collapse(painter, c, n);
    return;
  }

  const count = n <= 4 ? 1 : n <= 7 ? 2 : n <= 12 ? 3 : 4;
  const copy = prefix(question, count);
  if (n === 1) {
    c.fillStyle = '#ce101c';
    c.fillRect(0, 0, 1440, 1080);
  } else if (n === 2) {
    c.fillStyle = '#e8b900';
    c.fillRect(0, 0, 1440, 1080);
  }
  // x-height/baseline rulers: full width while the oversized type pans through them.
  c.save();
  if (n === 2) {
    c.strokeStyle = '#654020';
    c.lineWidth = 8;
    c.setLineDash([44, 44]);
    c.stroke(new Path2D('M0 108 H1440 M0 957 H1440'));
  } else if (n >= 3) {
    c.strokeStyle = '#633b25';
    c.lineWidth = 4;
    c.setLineDash([44, 44]);
    c.lineDashOffset = n * 3;
    c.globalAlpha = 0.86;
    c.stroke(new Path2D('M0 444 H1440 M0 620 H1440'));
  }
  c.restore();
  if (n === 13) {
    c.fillStyle = '#211914';
    c.fill(openingType);
    return;
  }
  painter.group(c, { transform: animate(pan, t) }, (g) => {
    painter.group(g, {
      transform: Transform.of({ ty: n === 1 ? 1130 : 620, sx: 6, sy: n === 1 ? 30 : 6.5 }),
    }, (g2) => label(g2, copy, 0, 0, 54, '#211914', false));
  });
  const cursor = { 8: [506, 369, 934, 257, '#191716'], 9: [890, 369, 456, 257, '#191716'], 10: [1252, 369, 9, 257, '#38241b'] }[n];
  if (cursor) {
    c.fillStyle = cursor[4];
    c.fillRect(cursor[0], cursor[1], cursor[2], cursor[3]);
  }
}
