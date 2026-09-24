import type { Template } from './types';

/** Self-contained vector artwork. No network fonts, random state, or media. */
export const titleExplainerTemplate: Template = {
  id: 'title-explainer', label: 'Title explainer',
  generate(name, options) {
    const data = JSON.stringify({ title: name, subtitle: 'A thought. A composition. A finished film.', ...options.defaultProps }).replace(/</g, '\\u003c');
    return [{ path: 'composition.html', content: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Helios title explainer</title>
<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#0c1622}canvas{width:100%;height:100%;display:block}</style></head>
<body><canvas id="scene" width="${options.width}" height="${options.height}"></canvas>
<script type="module">
import { Helios } from '@helios-project/core';
const defaults = ${data};
const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
const duration = ${options.duration};
const helios = new Helios({ duration, fps: ${options.fps}, inputProps: defaults });
window.helios = helios;
helios.bindToDocumentTimeline();
const clamp = x => Math.max(0, Math.min(1, x));
const ease = x => Math.sqrt(1 - Math.pow(clamp(x) - 1, 2));
function draw(state) {
  const t = state.currentFrame / state.fps;
  const p = clamp(t / duration);
  const props = { ...defaults, ...state.inputProps };
  ctx.save(); ctx.scale(${options.width} / 1280, ${options.height} / 720);
  const gradient = ctx.createLinearGradient(0, 0, 1280, 720);
  gradient.addColorStop(0, '#0c1622'); gradient.addColorStop(1, '#153632');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1280, 720);
  // Persistent drafting grid and a slow orbital field.
  ctx.strokeStyle = '#bed7c810'; ctx.lineWidth = 1;
  for (let x = -80; x < 1400; x += 80) { ctx.beginPath(); ctx.moveTo(x + p * 36, 0); ctx.lineTo(x + p * 36, 720); ctx.stroke(); }
  for (let y = 0; y < 800; y += 80) { ctx.beginPath(); ctx.moveTo(0, y - p * 24); ctx.lineTo(1280, y - p * 24); ctx.stroke(); }
  ctx.save(); ctx.translate(1060, 280); ctx.rotate(-0.3 + p * 0.45);
  for (let i = 0; i < 4; i++) { ctx.strokeStyle = '#b8efb4' + ['20','16','10','08'][i]; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, 120 + i * 42, 210 + i * 26, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = '#d8f5a2'; ctx.beginPath(); ctx.arc(120 * Math.cos(p * 4), 210 * Math.sin(p * 4), 7, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#d8f5a2'; ctx.font = '600 18px Arial'; ctx.fillText('HELIOS  /  KODY', 80, 82);
  ctx.fillStyle = '#a6bab1'; ctx.font = '14px monospace'; ctx.fillText('IDEAS INTO MOTION', 990, 82);
  const title = String(props.title).slice(0, 100);
  const words = title.split(/\\s+/); const lines = []; let line = '';
  ctx.font = '700 78px Arial';
  for (const word of words) { const candidate = line ? line + ' ' + word : word; if (ctx.measureText(candidate).width > 920 && line) { lines.push(line); line = word; } else line = candidate; }
  if (line) lines.push(line);
  lines.slice(0, 3).forEach((text, i) => {
    const enter = ease((t - 0.2 - i * 0.12) / 0.8);
    ctx.globalAlpha = enter; ctx.fillStyle = '#f2f0df';
    ctx.fillText(text, 80, 230 + i * 88 + (1 - enter) * 45);
  });
  ctx.globalAlpha = 1; ctx.fillStyle = '#d8f5a2'; ctx.fillRect(82, 250 + Math.min(lines.length - 1, 2) * 88, 170 * ease((t - 0.7) / 0.8), 5);
  ctx.globalAlpha = ease((t - 1) / 0.8); ctx.font = '24px Arial'; ctx.fillStyle = '#b5c7bc';
  ctx.fillText(String(props.subtitle).slice(0, 85), 82, 308 + Math.min(lines.length - 1, 2) * 88);
  ctx.globalAlpha = 1;
  const labels = ['01  BRIEF', '02  COMPOSE', '03  RENDER', '04  PLAY'];
  const active = Math.min(3, Math.floor(p * 4.3));
  ctx.fillStyle = '#ffffff16'; ctx.fillRect(80, 587, 1120, 2);
  ctx.fillStyle = '#d8f5a2'; ctx.fillRect(80, 587, 1120 * ease(p), 2);
  labels.forEach((label, i) => {
    const x = 80 + i * 294; const enter = ease((t - 0.4 - i * 0.1) / 0.6);
    ctx.globalAlpha = enter; ctx.fillStyle = i <= active ? '#d8f5a2' : '#697d76';
    ctx.beginPath(); ctx.arc(x + 4, 588, i === active ? 7 : 4, 0, Math.PI * 2); ctx.fill();
    ctx.font = '600 16px monospace'; ctx.fillText(label, x, 632);
  });
  ctx.globalAlpha = 1; ctx.fillStyle = '#82978e'; ctx.font = '13px monospace';
  ctx.fillText('BROWSER-NATIVE VIDEO', 80, 685);
  ctx.fillText(p > 0.9 ? 'READY TO PLAY' : 'FRAME ' + String(Math.floor(state.currentFrame)).padStart(4, '0'), 1050, 685);
  ctx.restore();
}
helios.subscribe(draw);
draw(helios.getState());
</script></body></html>` }];
  },
};
