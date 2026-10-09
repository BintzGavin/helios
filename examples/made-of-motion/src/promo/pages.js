// Tiny web pages, drawn with the 2D canvas: the "frames" of the promo. Each is a function of
// its own time `u` (seconds), designed in a 300×200 box and scaled to whatever it fills.

import { text } from '../painter.js';

export const UI = {
  navy: '#060B18',
  panel: '#0E1830',
  panel2: '#15233F',
  line: '#253A63',
  text: '#E8EEF8',
  dim: '#6F84A6',
  gold: '#F0BB3B',
  blue: '#449DF0',
  coral: '#FF6B5A',
  mint: '#3DDC97',
  violet: '#9B7BFF',
};

export const PAGE_KINDS = [
  'dashboard', 'code', 'landscape', 'video', 'chart', 'gallery',
  'metric', 'cube', 'map', 'profile', 'blob', 'article',
];

function rr(c, x, y, w, h, r, fill) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fillStyle = fill;
  c.fill();
}

function bar(c, x, y, w, h, fill) {
  rr(c, x, y, Math.max(w, 0), h, Math.min(h / 2, 3), fill);
}

const wave = (u, i, speed = 1) => 0.5 + 0.5 * Math.sin(u * speed * 2 + i * 1.7);

const DRAW = {
  dashboard(c, u) {
    bar(c, 16, 38, 90, 9, UI.text);
    bar(c, 16, 54, 60, 6, UI.dim);
    const colors = [UI.blue, UI.gold, UI.mint, UI.violet, UI.coral, UI.blue, UI.gold];
    colors.forEach((col, i) => {
      const h = 22 + 70 * (0.35 + 0.65 * wave(u, i, 0.9));
      bar(c, 18 + i * 26, 182 - h, 16, h, col);
    });
    rr(c, 206, 38, 78, 60, 8, UI.panel2);
    c.beginPath();
    c.arc(245, 68, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (0.25 + 0.6 * wave(u, 3, 0.4)));
    c.strokeStyle = UI.gold;
    c.lineWidth = 6;
    c.lineCap = 'round';
    c.stroke();
    rr(c, 206, 108, 78, 74, 8, UI.panel2);
    for (let i = 0; i < 4; i++) bar(c, 216, 120 + i * 15, 40 + 18 * wave(u, i + 2), 6, i === 0 ? UI.text : UI.dim);
  },
  code(c, u) {
    const rows = [
      [[0, 34, UI.violet], [40, 50, UI.blue], [96, 40, UI.text]],
      [[14, 30, UI.coral], [50, 90, UI.mint]],
      [[14, 60, UI.blue], [80, 30, UI.gold], [116, 60, UI.text]],
      [[28, 46, UI.text], [80, 70, UI.violet]],
      [[28, 90, UI.mint], [124, 28, UI.gold]],
      [[14, 20, UI.coral]],
      [[0, 30, UI.violet], [36, 70, UI.text], [112, 44, UI.blue]],
      [[14, 80, UI.dim]],
    ];
    const shown = (u * 9) % (rows.length + 4);
    rows.forEach((row, i) => {
      if (i > shown) return;
      row.forEach(([x, w, col]) => bar(c, 18 + x, 38 + i * 18, w, 7, col));
    });
    const line = Math.min(Math.floor(shown), rows.length - 1);
    if (Math.floor(u * 3) % 2 === 0) bar(c, 18 + 160, 36 + line * 18, 3, 11, UI.gold);
  },
  landscape(c, u) {
    const sky = c.createLinearGradient(0, 30, 0, 200);
    sky.addColorStop(0, '#1B2B57');
    sky.addColorStop(1, '#E37A4A');
    c.fillStyle = sky;
    c.fillRect(0, 30, 300, 170);
    const sy = 150 - 70 * wave(u, 0, 0.25);
    c.fillStyle = UI.gold;
    c.beginPath();
    c.arc(200, sy, 20, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#26345E';
    c.beginPath();
    c.moveTo(0, 200);
    for (let x = 0; x <= 300; x += 10) c.lineTo(x, 150 - 26 * Math.sin(x / 40 + 1) - 10 * Math.sin(x / 13));
    c.lineTo(300, 200);
    c.fill();
    c.fillStyle = '#121C3A';
    c.beginPath();
    c.moveTo(0, 200);
    for (let x = 0; x <= 300; x += 10) c.lineTo(x, 172 - 14 * Math.sin(x / 30 + 3));
    c.lineTo(300, 200);
    c.fill();
  },
  video(c, u) {
    const g = c.createLinearGradient(0, 30, 300, 200);
    g.addColorStop(0, '#3A1E6E');
    g.addColorStop(1, '#0F4C81');
    c.fillStyle = g;
    c.fillRect(0, 30, 300, 170);
    c.fillStyle = 'rgba(255,255,255,0.92)';
    c.beginPath();
    c.arc(150, 108, 28, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#3A1E6E';
    c.beginPath();
    c.moveTo(141, 94);
    c.lineTo(165, 108);
    c.lineTo(141, 122);
    c.fill();
    bar(c, 16, 180, 268, 5, 'rgba(255,255,255,0.25)');
    bar(c, 16, 180, 268 * ((u * 0.18) % 1), 5, UI.gold);
  },
  chart(c, u) {
    bar(c, 16, 38, 70, 8, UI.text);
    c.strokeStyle = UI.line;
    c.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.moveTo(16, 80 + i * 28);
      c.lineTo(284, 80 + i * 28);
      c.stroke();
    }
    const draw = Math.min(1, (u * 0.6) % 1.4);
    c.beginPath();
    for (let i = 0; i <= 40 * draw; i++) {
      const x = 16 + (268 * i) / 40;
      const y = 150 - 60 * (0.5 + 0.5 * Math.sin(i / 5 + u * 0.8)) * (0.4 + i / 60);
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.strokeStyle = UI.mint;
    c.lineWidth = 3;
    c.lineJoin = 'round';
    c.stroke();
  },
  gallery(c, u) {
    const cols = [UI.coral, UI.blue, UI.gold, UI.violet, UI.mint, '#2B4C8C'];
    for (let i = 0; i < 6; i++) {
      const x = 14 + (i % 3) * 92;
      const y = 40 + Math.floor(i / 3) * 78;
      rr(c, x, y, 84, 70, 6, cols[(i + Math.floor(u * 1.5)) % cols.length]);
      c.globalAlpha = 0.25 * wave(u, i, 1.2);
      rr(c, x, y, 84, 70, 6, '#fff');
      c.globalAlpha = 1;
    }
  },
  metric(c, u) {
    text(c, { family: 'Space Grotesk', size: 64, x: 150, y: 132, copy: '24', anchor: 'middle', fill: UI.gold });
    text(c, { family: 'JetBrains Mono', size: 16, x: 150, y: 160, copy: 'fps', anchor: 'middle', fill: UI.dim });
    bar(c, 60, 176, 180, 4, UI.line);
    bar(c, 60, 176, 180 * ((u * 0.5) % 1), 4, UI.gold);
  },
  cube(c, u) {
    const a = u * 0.9;
    const b = 0.5 + 0.2 * Math.sin(u * 0.5);
    const pts = [];
    for (let i = 0; i < 8; i++) {
      let [x, y, z] = [(i & 1 ? 1 : -1), (i & 2 ? 1 : -1), (i & 4 ? 1 : -1)];
      [x, z] = [x * Math.cos(a) - z * Math.sin(a), x * Math.sin(a) + z * Math.cos(a)];
      [y, z] = [y * Math.cos(b) - z * Math.sin(b), y * Math.sin(b) + z * Math.cos(b)];
      const s = 44 / (1 + z * 0.18);
      pts.push([150 + x * s, 115 + y * s]);
    }
    c.strokeStyle = UI.blue;
    c.lineWidth = 2.5;
    for (let i = 0; i < 8; i++) {
      for (const bit of [1, 2, 4]) {
        const j = i | bit;
        if (j === i) continue;
        c.beginPath();
        c.moveTo(...pts[i]);
        c.lineTo(...pts[j]);
        c.stroke();
      }
    }
  },
  map(c, u) {
    for (let i = 0; i < 46; i++) {
      const x = 20 + ((i * 53) % 260);
      const y = 44 + ((i * 37) % 140);
      c.fillStyle = UI.line;
      c.beginPath();
      c.arc(x, y, 2.5, 0, Math.PI * 2);
      c.fill();
    }
    [[80, 90, UI.gold], [200, 120, UI.coral], [150, 160, UI.mint]].forEach(([x, y, col], i) => {
      const r = 4 + 12 * ((u * 0.8 + i * 0.33) % 1);
      c.strokeStyle = col;
      c.globalAlpha = 1 - ((u * 0.8 + i * 0.33) % 1);
      c.lineWidth = 2;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.stroke();
      c.globalAlpha = 1;
      c.fillStyle = col;
      c.beginPath();
      c.arc(x, y, 4, 0, Math.PI * 2);
      c.fill();
    });
  },
  profile(c, u) {
    c.fillStyle = UI.violet;
    c.beginPath();
    c.arc(60, 90, 30, 0, Math.PI * 2);
    c.fill();
    bar(c, 106, 70, 120, 10, UI.text);
    bar(c, 106, 90, 80, 7, UI.dim);
    for (let i = 0; i < 3; i++) rr(c, 20 + i * 90, 138, 80, 44, 6, UI.panel2);
    bar(c, 30, 152, 40 + 20 * wave(u, 1), 6, UI.gold);
    bar(c, 120, 152, 40 + 20 * wave(u, 2), 6, UI.blue);
    bar(c, 210, 152, 40 + 20 * wave(u, 3), 6, UI.mint);
  },
  blob(c, u) {
    const g = c.createRadialGradient(150, 115, 10, 150, 115, 90);
    g.addColorStop(0, UI.gold);
    g.addColorStop(0.5, UI.coral);
    g.addColorStop(1, UI.violet);
    c.fillStyle = g;
    c.beginPath();
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const r = 58 + 9 * Math.sin(a * 3 + u * 1.3) + 6 * Math.sin(a * 5 - u * 0.9);
      const x = 150 + Math.cos(a) * r * 1.2;
      const y = 115 + Math.sin(a) * r;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.fill();
  },
  article(c, u) {
    rr(c, 16, 38, 130, 80, 6, '#2B4C8C');
    c.fillStyle = UI.gold;
    c.beginPath();
    c.arc(60 + 40 * wave(u, 0, 0.3), 72, 12, 0, Math.PI * 2);
    c.fill();
    bar(c, 160, 40, 120, 10, UI.text);
    bar(c, 160, 58, 96, 10, UI.text);
    for (let i = 0; i < 4; i++) bar(c, 160, 82 + i * 12, i === 3 ? 60 : 118, 5, UI.dim);
    for (let i = 0; i < 4; i++) bar(c, 16, 132 + i * 13, i === 3 ? 140 : 268, 5, UI.dim);
  },
};

/** A page in the rectangle [x, y, w, h] (top-left, size), at its time `u`. */
export function drawPage(c, kind, x, y, w, h, u) {
  c.save();
  c.translate(x, y);
  c.scale(w / 300, h / 200);
  c.beginPath();
  c.roundRect(0, 0, 300, 200, 12);
  c.clip();
  c.fillStyle = UI.panel;
  c.fillRect(0, 0, 300, 200);
  DRAW[kind](c, u);
  // Window chrome: a top strip with three dots.
  c.fillStyle = 'rgba(6, 11, 24, 0.55)';
  c.fillRect(0, 0, 300, 26);
  [UI.coral, UI.gold, UI.mint].forEach((col, i) => {
    c.fillStyle = col;
    c.beginPath();
    c.arc(16 + i * 14, 13, 4, 0, Math.PI * 2);
    c.fill();
  });
  c.restore();
}

/**
 * The browser window of the "you give it time" shot: chrome with an address, and a page
 * whose parts move only when time runs (`u`), drawn with long-exposure trails behind them.
 */
export function drawBrowser(c, x, y, w, h, u, { live = true, trails = 7, exposure = 0.3 } = {}) {
  c.save();
  c.translate(x, y);
  const s = w / 640;
  c.scale(s, s);
  // Glass window and its chrome.
  c.shadowColor = 'rgba(240, 187, 59, 0.25)';
  c.shadowBlur = 60;
  rr(c, 0, 0, 640, 440, 18, UI.panel);
  c.shadowBlur = 0;
  c.strokeStyle = 'rgba(232, 238, 248, 0.16)';
  c.lineWidth = 1.5;
  c.beginPath();
  c.roundRect(0.75, 0.75, 638.5, 438.5, 18);
  c.stroke();
  c.fillStyle = 'rgba(6, 11, 24, 0.6)';
  c.beginPath();
  c.roundRect(0, 0, 640, 44, [18, 18, 0, 0]);
  c.fill();
  [UI.coral, UI.gold, UI.mint].forEach((col, i) => {
    c.fillStyle = col;
    c.beginPath();
    c.arc(26 + i * 20, 22, 6, 0, Math.PI * 2);
    c.fill();
  });
  rr(c, 130, 12, 380, 20, 10, UI.panel2);
  text(c, { family: 'JetBrains Mono', size: 13, x: 320, y: 27, copy: 'page.html', anchor: 'middle', fill: UI.dim });

  c.beginPath();
  c.rect(0, 44, 640, 396);
  c.clip();
  // The page, first its trail (older moments, fainter), then the present moment.
  const steps = live ? trails : 0;
  for (let k = steps; k >= 0; k--) {
    const at = u - (k * exposure) / Math.max(steps, 1);
    c.globalAlpha = k === 0 ? 1 : 0.16 * (1 - k / (steps + 1));
    pageContent(c, Math.max(at, 0), live);
  }
  c.globalAlpha = 1;
  c.restore();
}

function pageContent(c, u, live) {
  const t = live ? u : 0;
  // Header.
  c.fillStyle = UI.gold;
  c.beginPath();
  c.arc(40, 78, 9, 0, Math.PI * 2);
  c.fill();
  for (let i = 0; i < 4; i++) bar(c, 380 + i * 62, 74, 44, 8, UI.dim);
  // Headline that types itself.
  const line = 'hello, light.';
  const typed = live ? Math.min(line.length, Math.floor(t * 14)) : 0;
  if (typed > 0) text(c, { family: 'Space Grotesk', size: 44, x: 34, y: 160, copy: line.slice(0, typed), fill: UI.text });
  if (Math.floor(t * 4) % 2 === 0 || !live) bar(c, 36 + typed * 23.5, 124, 4, 44, UI.gold);
  bar(c, 36, 184, 250, 8, UI.dim);
  bar(c, 36, 200, 200, 8, UI.dim);
  // A button that breathes.
  const pulse = live ? 0.5 + 0.5 * Math.sin(t * 6) : 0;
  rr(c, 36, 230, 130, 40, 20, UI.blue);
  c.save();
  c.globalAlpha *= 0.3 * pulse;
  rr(c, 30, 224, 142, 52, 26, UI.blue);
  c.restore();
  // A sun that crosses its little sky.
  rr(c, 330, 112, 270, 160, 12, '#13213F');
  const sx = 360 + 210 * ((t * 0.45) % 1);
  const sy = 240 - 100 * Math.sin(Math.PI * ((t * 0.45) % 1));
  c.fillStyle = UI.gold;
  c.beginPath();
  c.arc(sx, sy, 16, 0, Math.PI * 2);
  c.fill();
  // Bars that grow, a progress line that fills.
  [UI.mint, UI.violet, UI.coral, UI.blue, UI.gold, UI.mint].forEach((col, i) => {
    const h = 20 + 70 * (live ? 0.5 + 0.5 * Math.sin(t * 2.4 + i) : 0.3);
    bar(c, 36 + i * 46, 400 - h, 30, h, col);
  });
  rr(c, 330, 300, 270, 10, 5, UI.panel2);
  rr(c, 330, 300, 270 * (live ? (t * 0.35) % 1 : 0.1), 10, 5, UI.gold);
  for (let i = 0; i < 3; i++) bar(c, 330, 336 + i * 18, i === 2 ? 150 : 250, 7, UI.dim);
}
