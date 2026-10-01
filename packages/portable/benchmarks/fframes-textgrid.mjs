// Scene equations copied from fframes' MIT-licensed vs-remotion benchmark.
// Copyright (c) 2025-2026 Dmitriy Kovalenko; see LICENSE.fframes.txt.
// Pinned source: bacfc3c3212d3d9429468435bfdc1ae2a21c7b3b.
export const TEXT_GRID = Object.freeze({ width: 1920, height: 1080, frames: 300, fps: 30, nodes: 3334, columns: 47, rows: 71 });
export function hslToRgb(h, s = 0.75, l = 0.62) {
  const c = (1 - Math.abs(2 * l - 1)) * s, hp = h / 60, x = c * (1 - Math.abs(hp % 2 - 1)), m = l - c / 2;
  const rgb = hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  return '#' + rgb.map(value => Math.round((value + m) * 255).toString(16).padStart(2, '0')).join('');
}
export function drawTextGrid(ctx, { index: frame, fonts }) {
  ctx.font = `10px ${fonts.dm}`; ctx.textBaseline = 'alphabetic';
  for (let i = 0; i < TEXT_GRID.nodes; i++) {
    const x = (i % TEXT_GRID.columns) * TEXT_GRID.width / TEXT_GRID.columns + 2 + 4 * Math.sin(frame * 0.12 + i * 0.37);
    const y = Math.floor(i / TEXT_GRID.columns) * TEXT_GRID.height / TEXT_GRID.rows + 11 + 3 * Math.cos(frame * 0.09 + i * 0.23);
    ctx.globalAlpha = Number((0.3 + 0.7 * (0.5 + 0.5 * Math.sin(frame * 0.2 + i * 0.05))).toFixed(3));
    ctx.fillStyle = hslToRgb((i * 0.9 + frame * 4) % 360);
    ctx.fillText((i + frame) % 9 === 0 ? 'fframes' : String((frame * 37 + i * 101) % 10000), x, y);
  }
}
export function createTextGrid(font) {
  return { width: TEXT_GRID.width, height: TEXT_GRID.height, fps: { num: TEXT_GRID.fps, den: 1 }, frameCount: TEXT_GRID.frames, background: '#0b1020', fonts: { dm: font }, draw: drawTextGrid };
}
